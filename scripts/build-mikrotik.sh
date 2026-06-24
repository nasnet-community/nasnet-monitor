#!/usr/bin/env bash
set -euo pipefail

PLATFORM="${PLATFORM:-linux/arm64}"
ARCH="${ARCH:-arm64}"
IMAGE="${IMAGE:-nasnet-monitor:mikrotik}"
OUTPUT="${OUTPUT:-nasnet-monitor-mikrotik.tar}"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

command -v skopeo >/dev/null || { echo "skopeo not found (brew install skopeo)" >&2; exit 1; }

# Build single-platform image
docker buildx build --platform "$PLATFORM" --provenance=false --sbom=false \
  -t nasnet-monitor:build --load .

# Flatten to one rootfs layer
CID="$(docker create --platform "$PLATFORM" nasnet-monitor:build)"
trap 'docker rm "$CID" >/dev/null 2>&1 || true' EXIT
ROOTFS="$(mktemp -t nas-rootfs.XXXXXX.tar)"
docker export "$CID" -o "$ROOTFS"

# Reimport with metadata
docker import --platform "$PLATFORM" \
  -c 'ENTRYPOINT ["/nasnet-monitor"]' \
  -c 'ENV HOST=0.0.0.0' -c 'ENV PORT=8080' \
  -c 'ENV ENVIRONMENT=production' -c 'ENV DISH_ADDRESS=192.168.100.1:9200' \
  -c 'EXPOSE 8080' \
  "$ROOTFS" "$IMAGE"
rm -f "$ROOTFS"

# Convert to legacy docker-archive
rm -f "$OUTPUT"
skopeo copy --override-arch "$ARCH" --override-os linux \
  "docker-daemon:$IMAGE" \
  "docker-archive:$OUTPUT:$IMAGE"

echo "Wrote $ROOT/$OUTPUT"
