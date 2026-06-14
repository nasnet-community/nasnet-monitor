// Package server wires the HTTP server: middleware, routes, and lifecycle.
package server

import (
	"context"
	"log"
	"net/http"
	"strings"

	"github.com/labstack/echo/v4"
	echomiddleware "github.com/labstack/echo/v4/middleware"

	"nasnet-monitor/internal/config"
	"nasnet-monitor/internal/handler"
	"nasnet-monitor/internal/service"
	"nasnet-monitor/internal/web"
)

// Server owns the Echo instance and its configuration.
type Server struct {
	echo *echo.Echo
	cfg  *config.Config
}

// New builds a Server with global middleware and routes registered.
func New(cfg *config.Config, version string) *Server {
	e := echo.New()
	e.HideBanner = true

	s := &Server{echo: e, cfg: cfg}

	s.registerMiddleware()

	h := handler.New(
		service.NewStatusService(version),
		service.NewDishService(cfg.DishAddress),
	)
	s.registerRoutes(h)

	return s
}

// Start runs the HTTP server, blocking until it is shut down.
func (s *Server) Start() error {
	return s.echo.Start(":" + s.cfg.Port)
}

// Shutdown gracefully stops the HTTP server, respecting ctx's deadline.
func (s *Server) Shutdown(ctx context.Context) error {
	return s.echo.Shutdown(ctx)
}

func (s *Server) registerMiddleware() {
	e := s.echo

	e.Use(echomiddleware.RemoveTrailingSlash())

	e.Use(echomiddleware.RequestLoggerWithConfig(echomiddleware.RequestLoggerConfig{
		LogStatus:   true,
		LogMethod:   true,
		LogURI:      true,
		LogLatency:  true,
		LogError:    true,
		LogRemoteIP: true,
		LogValuesFunc: func(_ echo.Context, v echomiddleware.RequestLoggerValues) error {
			if v.Error == nil {
				log.Printf("%s %s %d %v", v.Method, v.URI, v.Status, v.Latency)
			} else {
				log.Printf("%s %s %d %v error=%v", v.Method, v.URI, v.Status, v.Latency, v.Error)
			}
			return nil
		},
	}))

	e.Use(echomiddleware.Recover())

	e.Use(echomiddleware.CORSWithConfig(echomiddleware.CORSConfig{
		AllowOrigins: []string{"*"},
		AllowMethods: []string{echo.GET, echo.HEAD, echo.PUT, echo.PATCH, echo.POST, echo.DELETE},
		AllowHeaders: []string{
			echo.HeaderOrigin,
			echo.HeaderContentType,
			echo.HeaderAccept,
			echo.HeaderAuthorization,
			handler.DishAddressHeader,
		},
	}))

	e.Use(echomiddleware.StaticWithConfig(echomiddleware.StaticConfig{
		HTML5:      true,
		Root:       "dist",
		Filesystem: http.FS(web.Dist),
		Skipper: func(c echo.Context) bool {
			return strings.HasPrefix(c.Request().URL.Path, "/api/")
		},
	}))
}
