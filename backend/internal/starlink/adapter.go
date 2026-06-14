// Package starlink provides descriptor-driven (grpcurl-style) invocation of the
// SpaceX.API.Device.Device gRPC service over swappable descriptor sources.
//
// The descriptor source is the adapter seam: it is what lets the API connect to
// different "protosets" (per-firmware gRPC schemas). The only implementation today
// is reflection (the dish serves its own descriptors), but the interface is kept
// open for an embedded-protoset adapter.
package starlink

import (
	"context"

	"github.com/fullstorydev/grpcurl"
	"google.golang.org/grpc"
)

// Fully-qualified schema symbols for the Starlink device service.
const (
	// DeviceService is the fully-qualified gRPC service name.
	DeviceService = "SpaceX.API.Device.Device"
	// DeviceHandleMethod is the unary Handle method in dotted form.
	DeviceHandleMethod = DeviceService + ".Handle"

	requestType = "SpaceX.API.Device.Request"
)

// DescriptorSourceProvider is the adapter seam: each implementation produces a
// descriptor source describing a dish's gRPC schema for the connection in use.
type DescriptorSourceProvider interface {
	// Source returns a descriptor source for the dish reachable over conn, plus a
	// cleanup function that the caller must invoke when finished.
	Source(ctx context.Context, conn *grpc.ClientConn) (grpcurl.DescriptorSource, func(), error)
	// Name identifies the adapter for logging and diagnostics.
	Name() string
}
