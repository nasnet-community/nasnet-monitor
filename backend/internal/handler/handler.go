package handler

import "nasnet-monitor/internal/service"

type Handler struct {
	status *service.StatusService
	dish   *service.DishService
}

func New(status *service.StatusService, dish *service.DishService) *Handler {
	return &Handler{status: status, dish: dish}
}
