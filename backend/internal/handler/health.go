package handler

import (
	"net/http"

	"github.com/labstack/echo/v4"
)

// HealthResponse is returned by the health check endpoint.
type HealthResponse struct {
	Status string `json:"status"`
	Server string `json:"server"`
}

// Health returns the health status of the API.
func (*Handler) Health(c echo.Context) error {
	return c.JSON(http.StatusOK, HealthResponse{
		Status: "healthy",
		Server: "nasnet-monitor",
	})
}
