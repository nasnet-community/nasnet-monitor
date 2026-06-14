package handler

import "github.com/labstack/echo/v4"

// Response is the standard envelope returned by all API endpoints.
type Response struct {
	Status  int         `json:"status"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
	Error   string      `json:"error,omitempty"`
}

// ErrorResponse writes a standardized error envelope.
func ErrorResponse(c echo.Context, status int, message string, err error) error {
	msg := ""
	if err != nil {
		msg = err.Error()
	}
	return c.JSON(status, Response{Status: status, Message: message, Error: msg})
}

// SuccessResponse writes a standardized success envelope with a data payload.
func SuccessResponse(c echo.Context, status int, message string, data interface{}) error {
	return c.JSON(status, Response{Status: status, Message: message, Data: data})
}

// SimpleSuccessResponse writes a standardized success envelope without a payload.
func SimpleSuccessResponse(c echo.Context, status int, message string) error {
	return c.JSON(status, Response{Status: status, Message: message})
}
