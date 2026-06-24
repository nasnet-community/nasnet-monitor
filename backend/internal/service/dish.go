package service

import (
	"context"
	"encoding/json"
	"fmt"

	"nasnet-monitor/internal/starlink"
)

type DishService struct {
	client         *starlink.Client
	defaultAddress string
}

func NewDishService(defaultAddress string) *DishService {
	return &DishService{
		client:         starlink.NewClient(starlink.NewReflectionAdapter()),
		defaultAddress: defaultAddress,
	}
}

func (s *DishService) DefaultAddress() string {
	return s.defaultAddress
}

func (s *DishService) Status(ctx context.Context, address string) (json.RawMessage, error) {
	return s.call(ctx, address, "get_status", nil)
}

func (s *DishService) DeviceInfo(ctx context.Context, address string) (json.RawMessage, error) {
	return s.call(ctx, address, "get_device_info", nil)
}

func (s *DishService) History(ctx context.Context, address string) (json.RawMessage, error) {
	return s.call(ctx, address, "get_history", nil)
}

func (s *DishService) ObstructionMap(ctx context.Context, address string) (json.RawMessage, error) {
	return s.call(ctx, address, "dish_get_obstruction_map", nil)
}

func (s *DishService) GetConfig(ctx context.Context, address string) (json.RawMessage, error) {
	return s.call(ctx, address, "dish_get_config", nil)
}

func (s *DishService) SetConfig(ctx context.Context, address string, cfg json.RawMessage) (json.RawMessage, error) {
	return s.call(ctx, address, "dish_set_config", cfg)
}

func (s *DishService) Reboot(ctx context.Context, address string) (json.RawMessage, error) {
	return s.call(ctx, address, "reboot", nil)
}

func (s *DishService) Stow(ctx context.Context, address string, unstow bool) (json.RawMessage, error) {
	payload, err := json.Marshal(map[string]bool{"unstow": unstow})
	if err != nil {
		return nil, fmt.Errorf("encode stow payload: %w", err)
	}
	return s.call(ctx, address, "dish_stow", payload)
}

func (s *DishService) ClearObstructionMap(ctx context.Context, address string) (json.RawMessage, error) {
	return s.call(ctx, address, "dish_clear_obstruction_map", nil)
}

func (s *DishService) Handle(ctx context.Context, address string, request json.RawMessage) (json.RawMessage, error) {
	return s.invoke(ctx, address, request)
}

func (s *DishService) Describe(ctx context.Context, address string) (*starlink.Schema, error) {
	return s.client.Describe(ctx, s.resolve(address))
}

func (s *DishService) DescribeRequest(ctx context.Context, address, oneof string) (*starlink.MessageInfo, error) {
	return s.client.DescribeRequest(ctx, s.resolve(address), oneof)
}

func (s *DishService) call(ctx context.Context, address, oneofKey string, payload json.RawMessage) (json.RawMessage, error) {
	body, err := buildHandleRequest(oneofKey, payload)
	if err != nil {
		return nil, err
	}
	return s.invoke(ctx, address, body)
}

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
