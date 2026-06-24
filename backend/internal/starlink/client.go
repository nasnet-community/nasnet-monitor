package starlink

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/fullstorydev/grpcurl"
	"github.com/jhump/protoreflect/desc"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/credentials/insecure"
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
	err := c.withSource(ctx, address, func(callCtx context.Context, conn *grpc.ClientConn, src grpcurl.DescriptorSource) error {
		parser, formatter, perr := grpcurl.RequestParserAndFormatter(
			grpcurl.FormatJSON, src, bytes.NewReader(reqJSON),
			grpcurl.FormatOptions{EmitJSONDefaultFields: true},
		)
		if perr != nil {
			return fmt.Errorf("prepare request: %w", perr)
		}

		var buf bytes.Buffer
		h := &grpcurl.DefaultEventHandler{Out: &buf, Formatter: formatter}

		if ierr := grpcurl.InvokeRPC(callCtx, src, conn, method, nil, h, parser.Next); ierr != nil {
			return fmt.Errorf("invoke %s: %w", method, ierr)
		}
		if h.Status != nil && h.Status.Code() != codes.OK {
			return &rpcError{status: h.Status}
		}
		out = json.RawMessage(bytes.TrimSpace(buf.Bytes()))
		return nil
	})
	return out, err
}

func (c *Client) Describe(ctx context.Context, address string) (*Schema, error) {
	schema := &Schema{Service: DeviceService}
	err := c.withSource(ctx, address, func(_ context.Context, _ *grpc.ClientConn, src grpcurl.DescriptorSource) error {
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
	err := c.withSource(ctx, address, func(_ context.Context, _ *grpc.ClientConn, src grpcurl.DescriptorSource) error {
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

func (c *Client) withSource(ctx context.Context, address string, fn func(ctx context.Context, conn *grpc.ClientConn, src grpcurl.DescriptorSource) error) error {
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
