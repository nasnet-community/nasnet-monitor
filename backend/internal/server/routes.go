package server

import "nasnet-monitor/internal/handler"

func (s *Server) registerRoutes(h *handler.Handler) {
	s.echo.GET("/health", h.Health)

	api := s.echo.Group("/api")
	api.GET("/status", h.Status)
	api.GET("/update-check", h.UpdateCheck)

	dish := api.Group("/dish")
	dish.POST("/status", h.DishStatus)
	dish.POST("/device-info", h.DishDeviceInfo)
	dish.POST("/history", h.DishHistory)
	dish.POST("/obstruction-map", h.DishObstructionMap)
	dish.POST("/get-config", h.DishGetConfig)
	dish.POST("/set-config", h.DishSetConfig)
	dish.POST("/reboot", h.DishReboot)
	dish.POST("/stow", h.DishStow)
	dish.POST("/clear-obstruction-map", h.DishClearObstructionMap)
	dish.POST("/handle", h.DishHandle)
	dish.POST("/describe", h.DishDescribe)
}
