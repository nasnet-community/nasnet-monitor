package starlink

import (
	"context"
	"fmt"

	"github.com/jhump/protoreflect/desc"
	"github.com/jhump/protoreflect/grpcreflect"
	"google.golang.org/grpc"
)

type ReflectionAdapter struct{}

func NewReflectionAdapter() *ReflectionAdapter {
	return &ReflectionAdapter{}
}

func (*ReflectionAdapter) Source(ctx context.Context, conn *grpc.ClientConn) (DescriptorSource, func(), error) {
	rc := grpcreflect.NewClientAuto(ctx, conn)
	return &reflectionSource{rc: rc}, rc.Reset, nil
}

func (*ReflectionAdapter) Name() string {
	return "reflection"
}

type reflectionSource struct {
	rc *grpcreflect.Client
}

func (s *reflectionSource) FindSymbol(name string) (desc.Descriptor, error) {
	fd, err := s.rc.FileContainingSymbol(name)
	if err != nil {
		return nil, fmt.Errorf("resolve %q: %w", name, err)
	}
	if d := fd.FindSymbol(name); d != nil {
		return d, nil
	}
	return nil, fmt.Errorf("symbol %q not found in %s", name, fd.GetName())
}
