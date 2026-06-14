package starlink

import (
	"fmt"

	"google.golang.org/grpc/status"
)

// rpcError wraps a non-OK gRPC status returned by the dish.
type rpcError struct {
	status *status.Status
}

// Error implements the error interface.
func (e *rpcError) Error() string {
	return fmt.Sprintf("rpc %s: %s", e.status.Code(), e.status.Message())
}

// GRPCStatus exposes the underlying gRPC status for callers that inspect codes.
func (e *rpcError) GRPCStatus() *status.Status {
	return e.status
}
