package server

import "nasnet-monitor/internal/handler"

// registerRoutes mounts all HTTP routes. Add new feature groups here, keeping
// the transport wiring in this package and the logic in services.
func (s *Server) registerRoutes(h *handler.Handler) {
	s.echo.GET("/health", h.Health)

	api := s.echo.Group("/api")
	api.GET("/status", h.Status)

	// Starlink dish (gRPC reflection adapter). Target set via X-Dish-Address header.
	dish := api.Group("/dish")
	// reads
	dish.POST("/status", h.DishStatus)
	dish.POST("/device-info", h.DishDeviceInfo)
	dish.POST("/history", h.DishHistory)
	dish.POST("/obstruction-map", h.DishObstructionMap)
	dish.POST("/get-config", h.DishGetConfig)
	// write
	dish.POST("/set-config", h.DishSetConfig)
	// actions
	dish.POST("/reboot", h.DishReboot)
	dish.POST("/stow", h.DishStow)
	dish.POST("/clear-obstruction-map", h.DishClearObstructionMap)
	// generic + discovery
	dish.POST("/handle", h.DishHandle)
	dish.POST("/describe", h.DishDescribe)
}
