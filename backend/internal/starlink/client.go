package starlink

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/jhump/protoreflect/desc"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/encoding/protojson"
	"google.golang.org/protobuf/reflect/protoreflect"
	"google.golang.org/protobuf/reflect/protoregistry"
	"google.golang.org/protobuf/types/dynamicpb"
)

const defaultCallTimeout = 10 * time.Second

type Client struct {
	provider    DescriptorSourceProvider
	dialOptions []grpc.DialOption
	timeout     time.Duration
}

type Option func(*Client)

func WithDialOptions(opts ...grpc.DialOption) Option {
	return func(c *Client) { c.dialOptions = opts }
}

func WithTimeout(d time.Duration) Option {
	return func(c *Client) { c.timeout = d }
}

func NewClient(provider DescriptorSourceProvider, opts ...Option) *Client {
	c := &Client{
		provider:    provider,
		dialOptions: []grpc.DialOption{grpc.WithTransportCredentials(insecure.NewCredentials())},
		timeout:     defaultCallTimeout,
	}
	for _, opt := range opts {
		opt(c)
	}
	return c
}

type Schema struct {
	Service  string   `json:"service"`
	Methods  []string `json:"methods"`
	Requests []string `json:"requests"`
}

type MessageInfo struct {
	Name   string      `json:"name"`
	Fields []FieldInfo `json:"fields"`
}

type FieldInfo struct {
	Name       string       `json:"name"`
	Number     int32        `json:"number"`
	Type       string       `json:"type"`
	Repeated   bool         `json:"repeated,omitempty"`
	OneOf      string       `json:"oneof,omitempty"`
	EnumValues []string     `json:"enumValues,omitempty"`
	Message    *MessageInfo `json:"message,omitempty"`
}

const maxDescribeDepth = 6

func (c *Client) Invoke(ctx context.Context, address, method string, reqJSON []byte) (json.RawMessage, error) {
	var out json.RawMessage
	err := c.withSource(ctx, address, func(callCtx context.Context, conn *grpc.ClientConn, src DescriptorSource) error {
		mtd, merr := findMethod(src, method)
		if merr != nil {
			return merr
		}
		resolver := &sourceResolver{src: src}

		req := dynamicpb.NewMessage(mtd.GetInputType().UnwrapMessage())
		if body := bytes.TrimSpace(reqJSON); len(body) > 0 {
			opts := protojson.UnmarshalOptions{Resolver: resolver}
			if perr := opts.Unmarshal(body, req); perr != nil {
				return fmt.Errorf("prepare request: %w", perr)
			}
		}

		resp := dynamicpb.NewMessage(mtd.GetOutputType().UnwrapMessage())
		rpcPath := fmt.Sprintf("/%s/%s", mtd.GetService().GetFullyQualifiedName(), mtd.GetName())
		if ierr := conn.Invoke(callCtx, rpcPath, req, resp); ierr != nil {
			if st, ok := status.FromError(ierr); ok && st.Code() != codes.OK {
				return &rpcError{status: st}
			}
			return fmt.Errorf("invoke %s: %w", method, ierr)
		}

		data, ferr := protojson.MarshalOptions{EmitUnpopulated: true, Resolver: resolver}.Marshal(resp)
		if ferr != nil {
			return fmt.Errorf("format response: %w", ferr)
		}
		out = json.RawMessage(data)
		return nil
	})
	return out, err
}

func findMethod(src DescriptorSource, method string) (*desc.MethodDescriptor, error) {
	sep := strings.LastIndexAny(method, "./")
	if sep < 0 {
		return nil, fmt.Errorf("invalid method name %q", method)
	}
	svcName, mName := method[:sep], method[sep+1:]
	d, err := src.FindSymbol(svcName)
	if err != nil {
		return nil, fmt.Errorf("find service: %w", err)
	}
	sd, ok := d.(*desc.ServiceDescriptor)
	if !ok {
		return nil, fmt.Errorf("%s: not a service descriptor", svcName)
	}
	mtd := sd.FindMethodByName(mName)
	if mtd == nil {
		return nil, fmt.Errorf("service %s has no method %q", svcName, mName)
	}
	return mtd, nil
}

type sourceResolver struct {
	src DescriptorSource
}

func (r *sourceResolver) FindMessageByName(name protoreflect.FullName) (protoreflect.MessageType, error) {
	d, err := r.src.FindSymbol(string(name))
	if err != nil {
		return nil, protoregistry.NotFound
	}
	md, ok := d.(*desc.MessageDescriptor)
	if !ok {
		return nil, protoregistry.NotFound
	}
	return dynamicpb.NewMessageType(md.UnwrapMessage()), nil
}

func (r *sourceResolver) FindMessageByURL(url string) (protoreflect.MessageType, error) {
	name := url
	if i := strings.LastIndexByte(url, '/'); i >= 0 {
		name = url[i+1:]
	}
	return r.FindMessageByName(protoreflect.FullName(name))
}

func (*sourceResolver) FindExtensionByName(protoreflect.FullName) (protoreflect.ExtensionType, error) {
	return nil, protoregistry.NotFound
}

func (*sourceResolver) FindExtensionByNumber(protoreflect.FullName, protoreflect.FieldNumber) (protoreflect.ExtensionType, error) {
	return nil, protoregistry.NotFound
}

func (c *Client) Describe(ctx context.Context, address string) (*Schema, error) {
	schema := &Schema{Service: DeviceService}
	err := c.withSource(ctx, address, func(_ context.Context, _ *grpc.ClientConn, src DescriptorSource) error {
		svc, ferr := src.FindSymbol(DeviceService)
		if ferr != nil {
			return fmt.Errorf("find service: %w", ferr)
		}
		sd, ok := svc.(*desc.ServiceDescriptor)
		if !ok {
			return fmt.Errorf("%s: not a service descriptor", DeviceService)
		}
		for _, m := range sd.GetMethods() {
			schema.Methods = append(schema.Methods, m.GetName())
		}
		if req, rerr := src.FindSymbol(requestType); rerr == nil {
			if md, ok := req.(*desc.MessageDescriptor); ok {
				for _, f := range md.GetFields() {
					schema.Requests = append(schema.Requests, f.GetName())
				}
			}
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return schema, nil
}

func (c *Client) DescribeRequest(ctx context.Context, address, oneof string) (*MessageInfo, error) {
	var info *MessageInfo
	err := c.withSource(ctx, address, func(_ context.Context, _ *grpc.ClientConn, src DescriptorSource) error {
		req, ferr := src.FindSymbol(requestType)
		if ferr != nil {
			return fmt.Errorf("find request type: %w", ferr)
		}
		md, ok := req.(*desc.MessageDescriptor)
		if !ok {
			return fmt.Errorf("%s: not a message descriptor", requestType)
		}
		f := md.FindFieldByName(oneof)
		if f == nil {
			return fmt.Errorf("unknown request %q", oneof)
		}
		mt := f.GetMessageType()
		if mt == nil {
			info = &MessageInfo{Name: requestType, Fields: []FieldInfo{fieldInfo(f)}}
			return nil
		}
		info = describeMessage(mt, 0, map[string]bool{mt.GetFullyQualifiedName(): true})
		return nil
	})
	if err != nil {
		return nil, err
	}
	return info, nil
}

func describeMessage(md *desc.MessageDescriptor, depth int, seen map[string]bool) *MessageInfo {
	info := &MessageInfo{Name: md.GetFullyQualifiedName()}
	for _, f := range md.GetFields() {
		fi := fieldInfo(f)
		if mt := f.GetMessageType(); mt != nil {
			name := mt.GetFullyQualifiedName()
			if depth < maxDescribeDepth && !seen[name] {
				seen[name] = true
				fi.Message = describeMessage(mt, depth+1, seen)
				delete(seen, name)
			}
		}
		info.Fields = append(info.Fields, fi)
	}
	return info
}

func fieldInfo(f *desc.FieldDescriptor) FieldInfo {
	fi := FieldInfo{
		Name:     f.GetName(),
		Number:   f.GetNumber(),
		Type:     fieldTypeName(f),
		Repeated: f.IsRepeated(),
	}
	if oo := f.GetOneOf(); oo != nil {
		fi.OneOf = oo.GetName()
	}
	if et := f.GetEnumType(); et != nil {
		for _, v := range et.GetValues() {
			fi.EnumValues = append(fi.EnumValues, v.GetName())
		}
	}
	return fi
}

func fieldTypeName(f *desc.FieldDescriptor) string {
	if mt := f.GetMessageType(); mt != nil {
		return mt.GetFullyQualifiedName()
	}
	if et := f.GetEnumType(); et != nil {
		return et.GetFullyQualifiedName()
	}
	return strings.ToLower(strings.TrimPrefix(f.GetType().String(), "TYPE_"))
}

func (c *Client) withSource(ctx context.Context, address string, fn func(ctx context.Context, conn *grpc.ClientConn, src DescriptorSource) error) error {
	ctx, cancel := context.WithTimeout(ctx, c.timeout)
	defer cancel()

	conn, err := grpc.NewClient(address, c.dialOptions...)
	if err != nil {
		return fmt.Errorf("dial %q: %w", address, err)
	}
	defer func() { _ = conn.Close() }()

	src, cleanup, err := c.provider.Source(ctx, conn)
	if err != nil {
		return fmt.Errorf("resolve descriptors: %w", err)
	}
	defer cleanup()

	return fn(ctx, conn, src)
}
