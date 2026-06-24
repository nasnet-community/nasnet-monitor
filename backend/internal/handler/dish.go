package handler

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"strings"

	"github.com/labstack/echo/v4"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

const DishAddressHeader = "X-Dish-Address"

type dishStowRequest struct {
	Unstow bool `json:"unstow"`
}

type dishConfigRequest struct {
	Config json.RawMessage `json:"config"`
}

type dishHandleRequest struct {
	Request json.RawMessage `json:"request"`
}

type dishOp func(ctx context.Context, address string) (json.RawMessage, error)

func (h *Handler) dishAddr(c echo.Context) string {
	if a := c.Request().Header.Get(DishAddressHeader); a != "" {
		return a
	}
	return h.dish.DefaultAddress()
}

func (*Handler) dishError(c echo.Context, err error) error {
	log.Printf("dish request failed: %v", err)
	httpStatus, message := classifyDishError(err)
	return ErrorResponse(c, httpStatus, message, nil)
}

func classifyDishError(err error) (httpStatus int, message string) {
	st, ok := status.FromError(err)
	if !ok {
		return http.StatusBadGateway, "Couldn't reach the device. Check the address and your network connection."
	}
	switch st.Code() {
	case codes.DeadlineExceeded:
		return http.StatusGatewayTimeout, "The device didn't respond in time. Make sure it's powered on and reachable on your network."
	case codes.Unavailable:
		return http.StatusBadGateway, "Couldn't connect to the device. Check the address and your network connection."
	case codes.Unimplemented:
		return http.StatusBadGateway, "This device doesn't support that request — you may be connected to the wrong device (e.g. the dish vs the router)."
	case codes.PermissionDenied:
		return http.StatusForbidden, "The device refused this request. Some Wi-Fi management actions are only allowed from the official Starlink app."
	case codes.FailedPrecondition:
		if reason := strings.TrimSpace(st.Message()); reason != "" {
			return http.StatusConflict, "The device can't do that right now: " + reason + "."
		}
		return http.StatusConflict, "The device can't do that in its current state."
	default:
		return http.StatusBadGateway, "The request to the device failed. Please try again."
	}
}

func (h *Handler) run(c echo.Context, op dishOp) error {
	data, err := op(c.Request().Context(), h.dishAddr(c))
	if err != nil {
		return h.dishError(c, err)
	}
	return SuccessResponse(c, http.StatusOK, "ok", data)
}

func (h *Handler) DishStatus(c echo.Context) error { return h.run(c, h.dish.Status) }

func (h *Handler) DishDeviceInfo(c echo.Context) error { return h.run(c, h.dish.DeviceInfo) }

func (h *Handler) DishHistory(c echo.Context) error { return h.run(c, h.dish.History) }

func (h *Handler) DishObstructionMap(c echo.Context) error { return h.run(c, h.dish.ObstructionMap) }

func (h *Handler) DishGetConfig(c echo.Context) error { return h.run(c, h.dish.GetConfig) }

func (h *Handler) DishReboot(c echo.Context) error { return h.run(c, h.dish.Reboot) }

func (h *Handler) DishClearObstructionMap(c echo.Context) error {
	return h.run(c, h.dish.ClearObstructionMap)
}

func (h *Handler) DishStow(c echo.Context) error {
	var req dishStowRequest
	if err := c.Bind(&req); err != nil {
		return ErrorResponse(c, http.StatusBadRequest, "invalid request body", err)
	}
	data, err := h.dish.Stow(c.Request().Context(), h.dishAddr(c), req.Unstow)
	if err != nil {
		return h.dishError(c, err)
	}
	return SuccessResponse(c, http.StatusOK, "ok", data)
}

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
		return h.dishError(c, err)
	}
	return SuccessResponse(c, http.StatusOK, "ok", data)
}

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
		return h.dishError(c, err)
	}
	return SuccessResponse(c, http.StatusOK, "ok", data)
}

func (h *Handler) DishDescribe(c echo.Context) error {
	if oneof := c.QueryParam("request"); oneof != "" {
		data, err := h.dish.DescribeRequest(c.Request().Context(), h.dishAddr(c), oneof)
		if err != nil {
			return h.dishError(c, err)
		}
		return SuccessResponse(c, http.StatusOK, "ok", data)
	}
	data, err := h.dish.Describe(c.Request().Context(), h.dishAddr(c))
	if err != nil {
		return h.dishError(c, err)
	}
	return SuccessResponse(c, http.StatusOK, "ok", data)
}
