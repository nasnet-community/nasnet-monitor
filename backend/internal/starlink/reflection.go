package starlink

import (
	"context"

	"github.com/fullstorydev/grpcurl"
	"github.com/jhump/protoreflect/grpcreflect"
	"google.golang.org/grpc"
)

type ReflectionAdapter struct{}

func NewReflectionAdapter() *ReflectionAdapter {
	return &ReflectionAdapter{}
}

func (*ReflectionAdapter) Source(ctx context.Context, conn *grpc.ClientConn) (grpcurl.DescriptorSource, func(), error) {
	rc := grpcreflect.NewClientAuto(ctx, conn)
	return grpcurl.DescriptorSourceFromServer(ctx, rc), rc.Reset, nil
}

func (*ReflectionAdapter) Name() string {
	return "reflection"
}
