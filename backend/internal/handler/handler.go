// Package handler implements the HTTP transport layer: it decodes requests,
// delegates to services, and encodes responses.
package handler

import "nasnet-monitor/internal/service"

// Handler holds the dependencies shared by all HTTP handlers.
type Handler struct {
	status *service.StatusService
	dish   *service.DishService
}

// New creates a Handler wired with its service dependencies.
func New(status *service.StatusService, dish *service.DishService) *Handler {
	return &Handler{status: status, dish: dish}
}
