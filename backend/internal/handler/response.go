package handler

import "github.com/labstack/echo/v4"

type Response struct {
	Status  int         `json:"status"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
	Error   string      `json:"error,omitempty"`
}

func ErrorResponse(c echo.Context, status int, message string, err error) error {
	msg := ""
	if err != nil {
		msg = err.Error()
	}
	return c.JSON(status, Response{Status: status, Message: message, Error: msg})
}

func SuccessResponse(c echo.Context, status int, message string, data interface{}) error {
	return c.JSON(status, Response{Status: status, Message: message, Data: data})
}

func SimpleSuccessResponse(c echo.Context, status int, message string) error {
	return c.JSON(status, Response{Status: status, Message: message})
}
