package starlink

import (
	"fmt"

	"google.golang.org/grpc/status"
)

type rpcError struct {
	status *status.Status
}

func (e *rpcError) Error() string {
	return fmt.Sprintf("rpc %s: %s", e.status.Code(), e.status.Message())
}

func (e *rpcError) GRPCStatus() *status.Status {
	return e.status
}
