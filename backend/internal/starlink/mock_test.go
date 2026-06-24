package starlink

import (
	"context"
	"net"
	"strings"
	"sync"
	"testing"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/reflection"
	"google.golang.org/grpc/test/bufconn"
	"google.golang.org/protobuf/reflect/protodesc"
	"google.golang.org/protobuf/reflect/protoreflect"
	"google.golang.org/protobuf/reflect/protoregistry"
	"google.golang.org/protobuf/types/descriptorpb"
	"google.golang.org/protobuf/types/dynamicpb"
)

const deviceProtoPath = "spacex/device_mock.proto"

const bufTarget = "passthrough:///bufnet"

var (
	deviceSchemaOnce sync.Once
	deviceSchemaVal  *protoregistry.Files
)

func deviceSchema(t *testing.T) *protoregistry.Files {
	t.Helper()
	deviceSchemaOnce.Do(func() {
		files, err := protodesc.NewFiles(&descriptorpb.FileDescriptorSet{File: []*descriptorpb.FileDescriptorProto{deviceFDP()}})
		if err != nil {
			panic(err)
		}
		fd, err := files.FindFileByPath(deviceProtoPath)
		if err != nil {
			panic(err)
		}
		if err := protoregistry.GlobalFiles.RegisterFile(fd); err != nil {
			panic(err)
		}
		deviceSchemaVal = files
	})
	return deviceSchemaVal
}

func startMockDish(t *testing.T) *bufconn.Listener {
	t.Helper()
	files := deviceSchema(t)
	reqDesc := mustMessage(t, files, requestType)
	canned := cannedResponse(t, files)

	srv := grpc.NewServer()
	srv.RegisterService(&grpc.ServiceDesc{
		ServiceName: DeviceService,
		Methods: []grpc.MethodDesc{{
			MethodName: "Handle",
			Handler: func(_ any, _ context.Context, dec func(any) error, _ grpc.UnaryServerInterceptor) (any, error) {
				req := dynamicpb.NewMessage(reqDesc)
				if err := dec(req); err != nil {
					return nil, err
				}
				return canned, nil
			},
		}},
	}, nil)
	reflection.Register(srv)

	lis := bufconn.Listen(1 << 20)
	go func() { _ = srv.Serve(lis) }()
	t.Cleanup(srv.Stop)
	return lis
}

func dialOptions(lis *bufconn.Listener) []grpc.DialOption {
	return []grpc.DialOption{
		grpc.WithContextDialer(func(ctx context.Context, _ string) (net.Conn, error) {
			return lis.DialContext(ctx)
		}),
		grpc.WithTransportCredentials(insecure.NewCredentials()),
	}
}

func mustMessage(t *testing.T, files *protoregistry.Files, name string) protoreflect.MessageDescriptor {
	t.Helper()
	d, err := files.FindDescriptorByName(protoreflect.FullName(name))
	if err != nil {
		t.Fatalf("find %s: %v", name, err)
	}
	md, ok := d.(protoreflect.MessageDescriptor)
	if !ok {
		t.Fatalf("%s is not a message", name)
	}
	return md
}

func cannedResponse(t *testing.T, files *protoregistry.Files) *dynamicpb.Message {
	t.Helper()
	respDesc := mustMessage(t, files, "SpaceX.API.Device.Response")
	resp := dynamicpb.NewMessage(respDesc)
	gsField := respDesc.Fields().ByName("get_status")
	gs := dynamicpb.NewMessage(gsField.Message())
	gs.Set(gsField.Message().Fields().ByName("id"), protoreflect.ValueOfString("dishy-test"))
	gs.Set(gsField.Message().Fields().ByName("hardware_version"), protoreflect.ValueOfString("rev3_proto3"))
	resp.Set(gsField, protoreflect.ValueOfMessage(gs))
	return resp
}

func deviceFDP() *descriptorpb.FileDescriptorProto {
	str := func(name string, num int32) *descriptorpb.FieldDescriptorProto {
		return &descriptorpb.FieldDescriptorProto{
			Name:     strPtr(name),
			Number:   int32Ptr(num),
			Label:    descriptorpb.FieldDescriptorProto_LABEL_OPTIONAL.Enum(),
			Type:     descriptorpb.FieldDescriptorProto_TYPE_STRING.Enum(),
			JsonName: strPtr(jsonName(name)),
		}
	}
	oneofMsg := func(name string, num int32, typeName string) *descriptorpb.FieldDescriptorProto {
		return &descriptorpb.FieldDescriptorProto{
			Name:       strPtr(name),
			Number:     int32Ptr(num),
			Label:      descriptorpb.FieldDescriptorProto_LABEL_OPTIONAL.Enum(),
			Type:       descriptorpb.FieldDescriptorProto_TYPE_MESSAGE.Enum(),
			TypeName:   strPtr(typeName),
			OneofIndex: int32Ptr(0),
			JsonName:   strPtr(jsonName(name)),
		}
	}
	return &descriptorpb.FileDescriptorProto{
		Name:    strPtr(deviceProtoPath),
		Package: strPtr("SpaceX.API.Device"),
		Syntax:  strPtr("proto3"),
		MessageType: []*descriptorpb.DescriptorProto{
			{
				Name:      strPtr("Request"),
				Field:     []*descriptorpb.FieldDescriptorProto{oneofMsg("get_status", 1004, ".SpaceX.API.Device.GetStatusRequest")},
				OneofDecl: []*descriptorpb.OneofDescriptorProto{{Name: strPtr("request")}},
			},
			{
				Name:      strPtr("Response"),
				Field:     []*descriptorpb.FieldDescriptorProto{oneofMsg("get_status", 1004, ".SpaceX.API.Device.GetStatusResponse")},
				OneofDecl: []*descriptorpb.OneofDescriptorProto{{Name: strPtr("response")}},
			},
			{Name: strPtr("GetStatusRequest")},
			{
				Name:  strPtr("GetStatusResponse"),
				Field: []*descriptorpb.FieldDescriptorProto{str("id", 1), str("hardware_version", 2)},
			},
		},
		Service: []*descriptorpb.ServiceDescriptorProto{{
			Name: strPtr("Device"),
			Method: []*descriptorpb.MethodDescriptorProto{{
				Name:       strPtr("Handle"),
				InputType:  strPtr(".SpaceX.API.Device.Request"),
				OutputType: strPtr(".SpaceX.API.Device.Response"),
			}},
		}},
	}
}

func strPtr(s string) *string { return &s }
func int32Ptr(i int32) *int32 { return &i }

func jsonName(s string) string {
	parts := strings.Split(s, "_")
	for i := 1; i < len(parts); i++ {
		if parts[i] != "" {
			parts[i] = strings.ToUpper(parts[i][:1]) + parts[i][1:]
		}
	}
	return strings.Join(parts, "")
}
