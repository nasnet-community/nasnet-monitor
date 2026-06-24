package starlink

import (
	"context"

	"github.com/fullstorydev/grpcurl"
	"google.golang.org/grpc"
)

const (
	DeviceService = "SpaceX.API.Device.Device"

	DeviceHandleMethod = DeviceService + ".Handle"

	requestType = "SpaceX.API.Device.Request"
)

type DescriptorSourceProvider interface {
	Source(ctx context.Context, conn *grpc.ClientConn) (grpcurl.DescriptorSource, func(), error)

	Name() string
}
