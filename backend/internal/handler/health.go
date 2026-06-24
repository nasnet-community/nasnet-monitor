package handler

import (
	"net/http"

	"github.com/labstack/echo/v4"
)

type HealthResponse struct {
	Status string `json:"status"`
	Server string `json:"server"`
}

func (*Handler) Health(c echo.Context) error {
	return c.JSON(http.StatusOK, HealthResponse{
		Status: "healthy",
		Server: "nasnet-monitor",
	})
}
