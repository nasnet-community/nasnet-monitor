package handler

import (
	"net/http"

	"github.com/labstack/echo/v4"
)

func (h *Handler) UpdateCheck(c echo.Context) error {
	result, err := h.update.Check(c.Request().Context())
	if err != nil {
		return ErrorResponse(c, http.StatusBadGateway, "update check failed", err)
	}
	return SuccessResponse(c, http.StatusOK, "ok", result)
}
