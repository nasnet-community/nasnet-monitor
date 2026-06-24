package service

import (
	"encoding/json"
	"testing"
)

func TestDishService_DefaultAddress(t *testing.T) {
	s := NewDishService("1.2.3.4:9200")
	if got := s.DefaultAddress(); got != "1.2.3.4:9200" {
		t.Errorf("DefaultAddress() = %q, want 1.2.3.4:9200", got)
	}
}

func TestDishService_resolve(t *testing.T) {
	s := NewDishService("default:9200")
	if got := s.resolve(""); got != "default:9200" {
		t.Errorf("resolve(\"\") = %q, want default:9200", got)
	}
	if got := s.resolve("10.0.0.1:9200"); got != "10.0.0.1:9200" {
		t.Errorf("resolve(addr) = %q, want 10.0.0.1:9200", got)
	}
}

func TestBuildHandleRequest(t *testing.T) {
	tests := []struct {
		name    string
		oneof   string
		payload json.RawMessage
		want    string
	}{
		{"empty payload", "get_status", nil, `{"get_status":{}}`},
		{"with payload", "dish_set_config", json.RawMessage(`{"snowMode":"ALWAYS_ON"}`), `{"dish_set_config":{"snowMode":"ALWAYS_ON"}}`},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := buildHandleRequest(tt.oneof, tt.payload)
			if err != nil {
				t.Fatalf("buildHandleRequest: %v", err)
			}
			if string(got) != tt.want {
				t.Errorf("got %s, want %s", got, tt.want)
			}
		})
	}
}
