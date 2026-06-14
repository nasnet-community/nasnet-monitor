package handler

import (
	"context"
	"encoding/json"
	"net/http"

	"github.com/labstack/echo/v4"
)

// DishAddressHeader carries the dish gRPC target (host:port) per request.
const DishAddressHeader = "X-Dish-Address"

// dishStowRequest is the body for POST /api/dish/stow.
type dishStowRequest struct {
	Unstow bool `json:"unstow"`
}

// dishConfigRequest is the body for POST /api/dish/set-config.
type dishConfigRequest struct {
	Config json.RawMessage `json:"config"`
}

// dishHandleRequest is the body for POST /api/dish/handle.
type dishHandleRequest struct {
	Request json.RawMessage `json:"request"`
}

// dishOp is a no-body dish read or action keyed by address.
type dishOp func(ctx context.Context, address string) (json.RawMessage, error)

// dishAddr resolves the target dish address from the request header, falling back
// to the configured default.
func (h *Handler) dishAddr(c echo.Context) string {
	if a := c.Request().Header.Get(DishAddressHeader); a != "" {
		return a
	}
	return h.dish.DefaultAddress()
}

// run executes a no-body dish operation and writes the standard envelope.
func (h *Handler) run(c echo.Context, op dishOp) error {
	data, err := op(c.Request().Context(), h.dishAddr(c))
	if err != nil {
		return ErrorResponse(c, http.StatusBadGateway, "dish request failed", err)
	}
	return SuccessResponse(c, http.StatusOK, "ok", data)
}

// DishStatus returns the dish status.
func (h *Handler) DishStatus(c echo.Context) error { return h.run(c, h.dish.Status) }

// DishDeviceInfo returns the dish device info.
func (h *Handler) DishDeviceInfo(c echo.Context) error { return h.run(c, h.dish.DeviceInfo) }

// DishHistory returns historical statistics.
func (h *Handler) DishHistory(c echo.Context) error { return h.run(c, h.dish.History) }

// DishObstructionMap returns the obstruction map.
func (h *Handler) DishObstructionMap(c echo.Context) error { return h.run(c, h.dish.ObstructionMap) }

// DishGetConfig returns the dish configuration.
func (h *Handler) DishGetConfig(c echo.Context) error { return h.run(c, h.dish.GetConfig) }

// DishReboot reboots the dish.
func (h *Handler) DishReboot(c echo.Context) error { return h.run(c, h.dish.Reboot) }

// DishClearObstructionMap clears the stored obstruction map.
func (h *Handler) DishClearObstructionMap(c echo.Context) error {
	return h.run(c, h.dish.ClearObstructionMap)
}

// DishStow stows or unstows the dish.
func (h *Handler) DishStow(c echo.Context) error {
	var req dishStowRequest
	if err := c.Bind(&req); err != nil {
		return ErrorResponse(c, http.StatusBadRequest, "invalid request body", err)
	}
	data, err := h.dish.Stow(c.Request().Context(), h.dishAddr(c), req.Unstow)
	if err != nil {
		return ErrorResponse(c, http.StatusBadGateway, "dish request failed", err)
	}
	return SuccessResponse(c, http.StatusOK, "ok", data)
}

// DishSetConfig applies a dish configuration.
func (h *Handler) DishSetConfig(c echo.Context) error {
	var req dishConfigRequest
	if err := c.Bind(&req); err != nil {
		return ErrorResponse(c, http.StatusBadRequest, "invalid request body", err)
	}
	if len(req.Config) == 0 {
		return ErrorResponse(c, http.StatusBadRequest, "config is required", nil)
	}
	data, err := h.dish.SetConfig(c.Request().Context(), h.dishAddr(c), req.Config)
	if err != nil {
		return ErrorResponse(c, http.StatusBadGateway, "dish request failed", err)
	}
	return SuccessResponse(c, http.StatusOK, "ok", data)
}

// DishHandle performs a generic Device.Handle call with a caller-supplied request.
func (h *Handler) DishHandle(c echo.Context) error {
	var req dishHandleRequest
	if err := c.Bind(&req); err != nil {
		return ErrorResponse(c, http.StatusBadRequest, "invalid request body", err)
	}
	if len(req.Request) == 0 {
		return ErrorResponse(c, http.StatusBadRequest, "request is required", nil)
	}
	data, err := h.dish.Handle(c.Request().Context(), h.dishAddr(c), req.Request)
	if err != nil {
		return ErrorResponse(c, http.StatusBadGateway, "dish request failed", err)
	}
	return SuccessResponse(c, http.StatusOK, "ok", data)
}

// DishDescribe returns the dish's discovered Device service schema.
func (h *Handler) DishDescribe(c echo.Context) error {
	data, err := h.dish.Describe(c.Request().Context(), h.dishAddr(c))
	if err != nil {
		return ErrorResponse(c, http.StatusBadGateway, "dish describe failed", err)
	}
	return SuccessResponse(c, http.StatusOK, "ok", data)
}
