package starlink

import (
	"context"

	"github.com/jhump/protoreflect/desc"
	"google.golang.org/grpc"
)

const (
	DeviceService = "SpaceX.API.Device.Device"

	DeviceHandleMethod = DeviceService + ".Handle"

	requestType = "SpaceX.API.Device.Request"
)

type DescriptorSource interface {
	FindSymbol(name string) (desc.Descriptor, error)
}

type DescriptorSourceProvider interface {
	Source(ctx context.Context, conn *grpc.ClientConn) (DescriptorSource, func(), error)

	Name() string
}
