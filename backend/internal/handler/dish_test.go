package handler

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/labstack/echo/v4"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

func TestClassifyDishError_FailedPrecondition(t *testing.T) {
	err := status.Error(codes.FailedPrecondition, "Wifi has already been set up")
	httpStatus, message := classifyDishError(err)
	if httpStatus != http.StatusConflict {
		t.Errorf("status = %d, want %d", httpStatus, http.StatusConflict)
	}
	if !strings.Contains(message, "Wifi has already been set up") {
		t.Errorf("message %q should surface the device reason", message)
	}
}

func newJSONContext(method, target, body string) (*httptest.ResponseRecorder, echo.Context) {
	e := echo.New()
	req := httptest.NewRequestWithContext(context.Background(), method, target, strings.NewReader(body))
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	rec := httptest.NewRecorder()
	return rec, e.NewContext(req, rec)
}

func TestHandler_dishAddr(t *testing.T) {
	h := newHandler()

	_, c := newContext(http.MethodPost, "/api/dish/status")
	if got := h.dishAddr(c); got != "192.168.100.1:9200" {
		t.Errorf("default dishAddr = %q, want 192.168.100.1:9200", got)
	}

	_, c2 := newContext(http.MethodPost, "/api/dish/status")
	c2.Request().Header.Set(DishAddressHeader, "10.0.0.5:9200")
	if got := h.dishAddr(c2); got != "10.0.0.5:9200" {
		t.Errorf("header dishAddr = %q, want 10.0.0.5:9200", got)
	}
}

func TestHandler_DishHandle_BadBody(t *testing.T) {
	rec, c := newJSONContext(http.MethodPost, "/api/dish/handle", "{not json")

	if err := newHandler().DishHandle(c); err != nil {
		t.Fatalf("DishHandle: %v", err)
	}
	if rec.Code != http.StatusBadRequest {
		t.Errorf("status = %d, want %d", rec.Code, http.StatusBadRequest)
	}
}

func TestHandler_DishHandle_MissingRequest(t *testing.T) {
	rec, c := newJSONContext(http.MethodPost, "/api/dish/handle", `{}`)

	if err := newHandler().DishHandle(c); err != nil {
		t.Fatalf("DishHandle: %v", err)
	}
	if rec.Code != http.StatusBadRequest {
		t.Errorf("status = %d, want %d", rec.Code, http.StatusBadRequest)
	}
}

func TestHandler_DishSetConfig_MissingConfig(t *testing.T) {
	rec, c := newJSONContext(http.MethodPost, "/api/dish/set-config", `{}`)

	if err := newHandler().DishSetConfig(c); err != nil {
		t.Fatalf("DishSetConfig: %v", err)
	}
	if rec.Code != http.StatusBadRequest {
		t.Errorf("status = %d, want %d", rec.Code, http.StatusBadRequest)
	}
}
