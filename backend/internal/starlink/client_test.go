package starlink

import (
	"context"
	"encoding/json"
	"testing"
	"time"
)

func TestClient_Invoke_Reflection(t *testing.T) {
	lis := startMockDish(t)
	c := NewClient(NewReflectionAdapter(), WithDialOptions(dialOptions(lis)...))

	out, err := c.Invoke(context.Background(), bufTarget, DeviceHandleMethod, []byte(`{"get_status":{}}`))
	if err != nil {
		t.Fatalf("Invoke: %v", err)
	}

	var got struct {
		GetStatus struct {
			ID              string `json:"id"`
			HardwareVersion string `json:"hardwareVersion"`
		} `json:"getStatus"`
	}
	if err := json.Unmarshal(out, &got); err != nil {
		t.Fatalf("unmarshal %s: %v", out, err)
	}
	if got.GetStatus.ID != "dishy-test" {
		t.Errorf("id = %q, want dishy-test (raw: %s)", got.GetStatus.ID, out)
	}
	if got.GetStatus.HardwareVersion != "rev3_proto3" {
		t.Errorf("hardwareVersion = %q, want rev3_proto3", got.GetStatus.HardwareVersion)
	}
}

func TestClient_Describe(t *testing.T) {
	lis := startMockDish(t)
	c := NewClient(NewReflectionAdapter(), WithDialOptions(dialOptions(lis)...))

	schema, err := c.Describe(context.Background(), bufTarget)
	if err != nil {
		t.Fatalf("Describe: %v", err)
	}
	if schema.Service != DeviceService {
		t.Errorf("service = %q, want %q", schema.Service, DeviceService)
	}
	if !contains(schema.Methods, "Handle") {
		t.Errorf("methods %v missing Handle", schema.Methods)
	}
	if !contains(schema.Requests, "get_status") {
		t.Errorf("requests %v missing get_status", schema.Requests)
	}
}

func TestClient_Invoke_Unreachable(t *testing.T) {
	c := NewClient(NewReflectionAdapter(), WithTimeout(time.Second))

	_, err := c.Invoke(context.Background(), "127.0.0.1:1", DeviceHandleMethod, []byte(`{"get_status":{}}`))
	if err == nil {
		t.Fatal("expected error invoking an unreachable address")
	}
}

func contains(xs []string, want string) bool {
	for _, x := range xs {
		if x == want {
			return true
		}
	}
	return false
}
