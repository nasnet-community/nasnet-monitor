package service

import "time"

type StatusService struct {
	version   string
	startTime time.Time
}

func NewStatusService(version string) *StatusService {
	return &StatusService{version: version, startTime: time.Now()}
}

type Status struct {
	Service string
	Version string
	Uptime  time.Duration
}

func (s *StatusService) Snapshot() Status {
	return Status{
		Service: "nasnet-monitor",
		Version: s.version,
		Uptime:  time.Since(s.startTime),
	}
}
