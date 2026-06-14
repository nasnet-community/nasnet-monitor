package starlink

import (
	"context"

	"github.com/fullstorydev/grpcurl"
	"github.com/jhump/protoreflect/grpcreflect"
	"google.golang.org/grpc"
)

// ReflectionAdapter resolves descriptors live from the dish via gRPC server
// reflection, so it automatically matches whatever firmware/protoset the dish runs.
type ReflectionAdapter struct{}

// NewReflectionAdapter constructs a reflection-based descriptor provider.
func NewReflectionAdapter() *ReflectionAdapter {
	return &ReflectionAdapter{}
}

// Source builds a descriptor source from a reflection client over conn. The
// returned cleanup resets the reflection client's streams.
func (*ReflectionAdapter) Source(ctx context.Context, conn *grpc.ClientConn) (grpcurl.DescriptorSource, func(), error) {
	rc := grpcreflect.NewClientAuto(ctx, conn)
	return grpcurl.DescriptorSourceFromServer(ctx, rc), rc.Reset, nil
}

// Name returns the adapter name.
func (*ReflectionAdapter) Name() string {
	return "reflection"
}
