package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/labstack/echo/v4"

	"nasnet-monitor/internal/service"
)

func newHandler() *Handler {
	return New(
		service.NewStatusService("test"),
		service.NewDishService("192.168.100.1:9200"),
		service.NewUpdateService("test"),
	)
}

func newContext(method, target string) (*httptest.ResponseRecorder, echo.Context) {
	e := echo.New()
	req := httptest.NewRequestWithContext(context.Background(), method, target, http.NoBody)
	rec := httptest.NewRecorder()
	return rec, e.NewContext(req, rec)
}

func TestHandler_Health(t *testing.T) {
	rec, c := newContext(http.MethodGet, "/health")

	if err := newHandler().Health(c); err != nil {
		t.Fatalf("Health() error = %v", err)
	}
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusOK)
	}

	var body HealthResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode body: %v", err)
	}
	if body.Status != "healthy" {
		t.Errorf("Status = %q, want healthy", body.Status)
	}
}

func TestHandler_Status(t *testing.T) {
	rec, c := newContext(http.MethodGet, "/api/status")

	if err := newHandler().Status(c); err != nil {
		t.Fatalf("Status() error = %v", err)
	}
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusOK)
	}

	var body Response
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode body: %v", err)
	}
	if body.Status != http.StatusOK {
		t.Errorf("envelope status = %d, want %d", body.Status, http.StatusOK)
	}
}
