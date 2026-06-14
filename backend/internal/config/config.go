// Package config loads and validates runtime configuration from the environment.
package config

import (
	"fmt"
	"os"
	"strconv"
)

// Config holds runtime configuration.
type Config struct {
	Host string
	Port string
	Env  string
	// DishAddress is the fallback Starlink dish gRPC target used when a request
	// omits the X-Dish-Address header.
	DishAddress string
}

// Load reads configuration from the environment, applies defaults, and
// validates the result.
func Load() (*Config, error) {
	cfg := &Config{
		Host:        getEnv("HOST", "0.0.0.0"),
		Port:        getEnv("PORT", "8080"),
		Env:         getEnv("ENVIRONMENT", "development"),
		DishAddress: getEnv("DISH_ADDRESS", "192.168.100.1:9200"),
	}
	if err := cfg.validate(); err != nil {
		return nil, err
	}
	return cfg, nil
}

func (c *Config) validate() error {
	if _, err := strconv.Atoi(c.Port); err != nil {
		return fmt.Errorf("invalid PORT %q: must be numeric", c.Port)
	}
	return nil
}

func getEnv(key, fallback string) string {
	if v, ok := os.LookupEnv(key); ok {
		return v
	}
	return fallback
}
