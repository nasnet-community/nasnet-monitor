// Package web embeds the built frontend SPA into the backend binary.
package web

import "embed"

// Dist holds the embedded SPA assets. The frontend build output
// (../frontend/dist) is copied into this directory before a release build —
// see the Makefile `frontend` / `release` targets.
//
//go:embed all:dist
var Dist embed.FS
