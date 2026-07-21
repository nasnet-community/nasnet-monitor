# syntax=docker/dockerfile:1

# Build frontend
FROM --platform=$BUILDPLATFORM node:22-alpine AS frontend
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json tsconfig.app.json tsconfig.node.json ./
COPY vite.config.ts tailwind.config.ts postcss.config.js components.json ./
COPY frontend ./frontend
RUN npm run build

# Build backend with embedded SPA
FROM --platform=$BUILDPLATFORM golang:1.26.2-alpine AS backend
WORKDIR /app/backend
ARG VERSION=0.1.0
ARG TARGETOS
ARG TARGETARCH
COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend/ ./
RUN rm -rf internal/web/dist
COPY --from=frontend /app/frontend/dist ./internal/web/dist
RUN find internal/web/dist -type f \( -name '*.html' -o -name '*.css' -o -name '*.js' -o -name '*.mjs' -o -name '*.svg' -o -name '*.json' -o -name '*.txt' \) -exec gzip -9 {} +
RUN CGO_ENABLED=0 GOOS=${TARGETOS} GOARCH=${TARGETARCH} go build \
    -trimpath \
    -ldflags="-s -w -X main.version=${VERSION}" \
    -o /out/nasnet-monitor .

# Minimal runtime
FROM scratch
COPY --from=backend /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=backend /out/nasnet-monitor /nasnet-monitor
ENV HOST=0.0.0.0 \
    PORT=8080 \
    ENVIRONMENT=production \
    DISH_ADDRESS=192.168.100.1:9200
EXPOSE 8080
USER 65532:65532
ENTRYPOINT ["/nasnet-monitor"]
