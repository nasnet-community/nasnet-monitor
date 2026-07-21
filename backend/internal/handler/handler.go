package handler

import "nasnet-monitor/internal/service"

type Handler struct {
	status *service.StatusService
	dish   *service.DishService
	update *service.UpdateService
}

func New(status *service.StatusService, dish *service.DishService, update *service.UpdateService) *Handler {
	return &Handler{status: status, dish: dish, update: update}
}
