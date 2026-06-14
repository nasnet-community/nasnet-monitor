// Package main is the entrypoint for the NASNET-Monitor HTTP API server.
package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"nasnet-monitor/internal/config"
	"nasnet-monitor/internal/server"
)

// version is the service version, overridable at build time via
// -ldflags "-X main.version=...".
var version = "0.1.0"

const shutdownTimeout = 10 * time.Second

func main() {
	if err := run(); err != nil {
		log.Fatal(err)
	}
}

func run() error {
	cfg, err := config.Load()
	if err != nil {
		return fmt.Errorf("config: %w", err)
	}

	srv := server.New(cfg, version)

	serverErr := make(chan error, 1)
	go func() {
		if startErr := srv.Start(); startErr != nil && !errors.Is(startErr, http.ErrServerClosed) {
			serverErr <- startErr
		}
	}()

	printStartupInfo(cfg.Port)

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	// Wait for either a fatal startup error or a shutdown signal.
	select {
	case err := <-serverErr:
		return fmt.Errorf("server error: %w", err)
	case <-ctx.Done():
		stop()
	}

	log.Println("shutting down...")
	shutdownCtx, cancel := context.WithTimeout(context.Background(), shutdownTimeout)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		return fmt.Errorf("graceful shutdown failed: %w", err)
	}
	log.Println("server stopped")
	return nil
}

func printStartupInfo(port string) {
	fmt.Println()
	fmt.Println("╔════════════════════════════════════════════════════════════════╗")
	fmt.Println("║                      NASNET-MONITOR API                        ║")
	fmt.Println("║                Satellite-dish Monitoring Dashboard             ║")
	fmt.Println("╠════════════════════════════════════════════════════════════════╣")
	fmt.Println("║                                                                ║")
	fmt.Printf("║  🚀 Server running at http://0.0.0.0:%s                      ║\n", port)
	fmt.Println("║                                                                ║")
	fmt.Println("╚════════════════════════════════════════════════════════════════╝")
	fmt.Println()
}
