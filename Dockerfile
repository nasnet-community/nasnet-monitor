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

# Build backend with embedded SPA (static musl binary, cross-compiled from
# the build platform via zig so CI never compiles under QEMU emulation).
FROM --platform=$BUILDPLATFORM ghcr.io/rust-cross/cargo-zigbuild:latest AS backend
WORKDIR /app
ARG VERSION=0.1.0
ARG TARGETARCH
ENV APP_VERSION=${VERSION}
RUN case "${TARGETARCH}" in \
      amd64) echo x86_64-unknown-linux-musl ;; \
      arm64) echo aarch64-unknown-linux-musl ;; \
      *) echo "unsupported TARGETARCH: ${TARGETARCH}" >&2; exit 1 ;; \
    esac > /rust-target \
    && rustup target add "$(cat /rust-target)"

# Cache dependency compilation against dummy sources.
COPY backend/Cargo.toml backend/Cargo.lock backend/build.rs ./
RUN mkdir -p src dist \
    && echo 'fn main() {}' > src/main.rs \
    && touch src/lib.rs dist/index.html \
    && cargo zigbuild --release --target "$(cat /rust-target)" \
    && rm -rf src dist

# The real build; the memory-serve build script embeds and gzips the SPA.
# COPY --from preserves the frontend stage's older mtimes, which would make
# cargo skip the build-script rerun and keep the dummy dist — touch everything.
COPY backend/src ./src
COPY --from=frontend /app/frontend/dist ./dist
RUN find src dist -exec touch {} + \
    && cargo zigbuild --release --target "$(cat /rust-target)" \
    && cp "target/$(cat /rust-target)/release/nasnet-monitor" /nasnet-monitor

# Minimal runtime (TLS roots are compiled in; no CA bundle needed)
FROM scratch
COPY --from=backend /nasnet-monitor /nasnet-monitor
ENV HOST=0.0.0.0 \
    PORT=8080 \
    ENVIRONMENT=production \
    DISH_ADDRESS=192.168.100.1:9200
EXPOSE 8080
USER 65532:65532
ENTRYPOINT ["/nasnet-monitor"]
