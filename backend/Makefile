.PHONY: fmt fmt-check vet lint lint-fix test build run dev frontend release check

GOLANGCI_LINT ?= golangci-lint
FRONTEND_DIST ?= ../frontend/dist
WEB_DIST       = internal/web/dist

fmt:
	$(GOLANGCI_LINT) fmt

fmt-check:
	$(GOLANGCI_LINT) fmt --diff

vet:
	go vet ./...

lint:
	$(GOLANGCI_LINT) run --timeout=5m

lint-fix:
	$(GOLANGCI_LINT) run --fix --timeout=5m

test:
	go test ./...

build:
	go build ./...

run:
	go run .

dev:
	air

# Copy the built frontend (../frontend/dist) into the embed directory.
frontend:
	rm -rf $(WEB_DIST)
	cp -r $(FRONTEND_DIST) $(WEB_DIST)

# Production binary with the real frontend embedded.
release: frontend
	go build -o nasnet-monitor .

check: fmt-check vet lint test build
