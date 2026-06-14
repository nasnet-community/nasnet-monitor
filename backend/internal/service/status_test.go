package service

import "testing"

func TestStatusService_Snapshot(t *testing.T) {
	s := NewStatusService("1.2.3")

	snap := s.Snapshot()

	if snap.Service != "nasnet-monitor" {
		t.Errorf("Service = %q, want nasnet-monitor", snap.Service)
	}
	if snap.Version != "1.2.3" {
		t.Errorf("Version = %q, want 1.2.3", snap.Version)
	}
	if snap.Uptime < 0 {
		t.Errorf("Uptime = %v, want non-negative", snap.Uptime)
	}
}
