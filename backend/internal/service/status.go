// Package service holds the business logic, independent of the HTTP transport.
package service

import "time"

// StatusService reports service health metadata.
type StatusService struct {
	version   string
	startTime time.Time
}

// NewStatusService creates a StatusService, recording the start time as now.
func NewStatusService(version string) *StatusService {
	return &StatusService{version: version, startTime: time.Now()}
}

// Status is a point-in-time snapshot of service metadata.
type Status struct {
	Service string
	Version string
	Uptime  time.Duration
}

// Snapshot returns the current service status.
func (s *StatusService) Snapshot() Status {
	return Status{
		Service: "nasnet-monitor",
		Version: s.version,
		Uptime:  time.Since(s.startTime),
	}
}
