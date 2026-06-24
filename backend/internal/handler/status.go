package handler

import (
	"net/http"

	"github.com/labstack/echo/v4"
)

type StatusResponse struct {
	Service       string `json:"service"`
	Version       string `json:"version"`
	UptimeSeconds int64  `json:"uptimeSeconds"`
}

func (h *Handler) Status(c echo.Context) error {
	snap := h.status.Snapshot()
	return SuccessResponse(c, http.StatusOK, "ok", StatusResponse{
		Service:       snap.Service,
		Version:       snap.Version,
		UptimeSeconds: int64(snap.Uptime.Seconds()),
	})
}
