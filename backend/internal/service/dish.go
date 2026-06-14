package service

import (
	"context"
	"encoding/json"
	"fmt"

	"nasnet-monitor/internal/starlink"
)

// DishService exposes high-level Starlink dish operations over a starlink.Client.
// Each typed method wraps the matching Device.Handle request oneof.
type DishService struct {
	client         *starlink.Client
	defaultAddress string
}

// NewDishService wires a DishService backed by the reflection adapter.
func NewDishService(defaultAddress string) *DishService {
	return &DishService{
		client:         starlink.NewClient(starlink.NewReflectionAdapter()),
		defaultAddress: defaultAddress,
	}
}

// DefaultAddress returns the fallback dish address used when a request omits one.
func (s *DishService) DefaultAddress() string {
	return s.defaultAddress
}

// Status returns the dish status (get_status).
func (s *DishService) Status(ctx context.Context, address string) (json.RawMessage, error) {
	return s.call(ctx, address, "get_status", nil)
}

// DeviceInfo returns hardware/software device info (get_device_info).
func (s *DishService) DeviceInfo(ctx context.Context, address string) (json.RawMessage, error) {
	return s.call(ctx, address, "get_device_info", nil)
}

// History returns historical statistics (get_history).
func (s *DishService) History(ctx context.Context, address string) (json.RawMessage, error) {
	return s.call(ctx, address, "get_history", nil)
}

// ObstructionMap returns the obstruction map (dish_get_obstruction_map).
func (s *DishService) ObstructionMap(ctx context.Context, address string) (json.RawMessage, error) {
	return s.call(ctx, address, "dish_get_obstruction_map", nil)
}

// GetConfig returns the dish configuration (dish_get_config).
func (s *DishService) GetConfig(ctx context.Context, address string) (json.RawMessage, error) {
	return s.call(ctx, address, "dish_get_config", nil)
}

// SetConfig applies a dish configuration (dish_set_config). The cfg argument is
// the JSON body of the DishConfig message.
func (s *DishService) SetConfig(ctx context.Context, address string, cfg json.RawMessage) (json.RawMessage, error) {
	return s.call(ctx, address, "dish_set_config", cfg)
}

// Reboot reboots the dish (reboot).
func (s *DishService) Reboot(ctx context.Context, address string) (json.RawMessage, error) {
	return s.call(ctx, address, "reboot", nil)
}

// Stow stows or unstows the dish (dish_stow).
func (s *DishService) Stow(ctx context.Context, address string, unstow bool) (json.RawMessage, error) {
	payload, err := json.Marshal(map[string]bool{"unstow": unstow})
	if err != nil {
		return nil, fmt.Errorf("encode stow payload: %w", err)
	}
	return s.call(ctx, address, "dish_stow", payload)
}

// ClearObstructionMap clears the stored obstruction map (dish_clear_obstruction_map).
func (s *DishService) ClearObstructionMap(ctx context.Context, address string) (json.RawMessage, error) {
	return s.call(ctx, address, "dish_clear_obstruction_map", nil)
}

// Handle performs a generic Device.Handle call with a caller-supplied request body
// (a JSON object whose single key is the request oneof, e.g. {"get_status":{}}).
func (s *DishService) Handle(ctx context.Context, address string, request json.RawMessage) (json.RawMessage, error) {
	return s.invoke(ctx, address, request)
}

// Describe returns the dish's Device service methods and available request options.
func (s *DishService) Describe(ctx context.Context, address string) (*starlink.Schema, error) {
	return s.client.Describe(ctx, s.resolve(address))
}

// call builds {"<oneofKey>": payload} and invokes Device.Handle.
func (s *DishService) call(ctx context.Context, address, oneofKey string, payload json.RawMessage) (json.RawMessage, error) {
	body, err := buildHandleRequest(oneofKey, payload)
	if err != nil {
		return nil, err
	}
	return s.invoke(ctx, address, body)
}

// buildHandleRequest wraps payload as the Device.Handle request oneof
// {"<oneofKey>": payload}. A nil/empty payload becomes an empty object.
func buildHandleRequest(oneofKey string, payload json.RawMessage) (json.RawMessage, error) {
	if len(payload) == 0 {
		payload = json.RawMessage("{}")
	}
	body, err := json.Marshal(map[string]json.RawMessage{oneofKey: payload})
	if err != nil {
		return nil, fmt.Errorf("encode request: %w", err)
	}
	return body, nil
}

func (s *DishService) invoke(ctx context.Context, address string, reqJSON json.RawMessage) (json.RawMessage, error) {
	return s.client.Invoke(ctx, s.resolve(address), starlink.DeviceHandleMethod, reqJSON)
}

func (s *DishService) resolve(address string) string {
	if address == "" {
		return s.defaultAddress
	}
	return address
}
