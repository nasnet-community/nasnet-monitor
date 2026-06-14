package starlink

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/fullstorydev/grpcurl"
	"github.com/jhump/protoreflect/desc"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/credentials/insecure"
)

const defaultCallTimeout = 10 * time.Second

// Client invokes Device RPCs using a pluggable descriptor source provider.
type Client struct {
	provider    DescriptorSourceProvider
	dialOptions []grpc.DialOption
	timeout     time.Duration
}

// Option configures a Client.
type Option func(*Client)

// WithDialOptions overrides the gRPC dial options. Tests use this to inject a
// bufconn dialer; production uses the default plaintext credentials.
func WithDialOptions(opts ...grpc.DialOption) Option {
	return func(c *Client) { c.dialOptions = opts }
}

// WithTimeout overrides the per-call timeout.
func WithTimeout(d time.Duration) Option {
	return func(c *Client) { c.timeout = d }
}

// NewClient creates a Client that resolves descriptors via the given provider.
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

// Schema describes a dish's Device service as discovered from its descriptors.
type Schema struct {
	Service  string   `json:"service"`
	Methods  []string `json:"methods"`
	Requests []string `json:"requests"`
}

// Invoke calls method (dotted form, e.g. DeviceHandleMethod) on the dish reachable
// at address, sending reqJSON and returning the response formatted as JSON.
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

// Describe resolves the dish schema and returns the Device service methods and the
// available Handle request options (the Request message's oneof field names).
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

// withSource dials address, builds a descriptor source via the provider, and runs
// fn with both. It applies the per-call timeout and cleans up the connection and
// descriptor source.
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
