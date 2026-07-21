package server

import (
	"bytes"
	"compress/gzip"
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"testing/fstest"

	"github.com/labstack/echo/v4"
)

func gz(t *testing.T, s string) []byte {
	t.Helper()
	var buf bytes.Buffer
	zw := gzip.NewWriter(&buf)
	if _, err := zw.Write([]byte(s)); err != nil {
		t.Fatal(err)
	}
	if err := zw.Close(); err != nil {
		t.Fatal(err)
	}
	return buf.Bytes()
}

func testApp(t *testing.T) *echo.Echo {
	t.Helper()
	fsys := fstest.MapFS{
		"index.html.gz":    {Data: gz(t, "<html>spa</html>")},
		"assets/app.js.gz": {Data: gz(t, "console.log('hi')")},
		"favicon.png":      {Data: []byte("png-bytes")},
	}
	e := echo.New()
	e.Use(staticSPA(fsys))
	e.GET("/health", func(c echo.Context) error { return c.String(http.StatusOK, "ok") })
	e.GET("/api/status", func(c echo.Context) error { return c.String(http.StatusOK, "api") })
	return e
}

func get(e *echo.Echo, path string, gzipOK bool) *httptest.ResponseRecorder {
	req := httptest.NewRequestWithContext(context.Background(), http.MethodGet, path, http.NoBody)
	if gzipOK {
		req.Header.Set(echo.HeaderAcceptEncoding, "gzip, deflate, br")
	}
	rec := httptest.NewRecorder()
	e.ServeHTTP(rec, req)
	return rec
}

func gunzip(t *testing.T, b []byte) string {
	t.Helper()
	zr, err := gzip.NewReader(bytes.NewReader(b))
	if err != nil {
		t.Fatalf("gzip reader: %v", err)
	}
	defer func() { _ = zr.Close() }()
	out, err := io.ReadAll(zr)
	if err != nil {
		t.Fatalf("gunzip: %v", err)
	}
	return string(out)
}

func TestStaticSPA_GzipNegotiation(t *testing.T) {
	e := testApp(t)

	rec := get(e, "/", true)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d", rec.Code)
	}
	if enc := rec.Header().Get(echo.HeaderContentEncoding); enc != "gzip" {
		t.Errorf("Content-Encoding = %q, want gzip", enc)
	}
	if got := gunzip(t, rec.Body.Bytes()); got != "<html>spa</html>" {
		t.Errorf("body = %q", got)
	}
	if ct := rec.Header().Get(echo.HeaderContentType); !strings.Contains(ct, "text/html") {
		t.Errorf("Content-Type = %q", ct)
	}

	rec = get(e, "/", false)
	if enc := rec.Header().Get(echo.HeaderContentEncoding); enc != "" {
		t.Errorf("Content-Encoding = %q, want none", enc)
	}
	if rec.Body.String() != "<html>spa</html>" {
		t.Errorf("body = %q, want decompressed html", rec.Body.String())
	}
}

func TestStaticSPA_Assets(t *testing.T) {
	e := testApp(t)

	rec := get(e, "/assets/app.js", true)
	if rec.Code != http.StatusOK || rec.Header().Get(echo.HeaderContentEncoding) != "gzip" {
		t.Fatalf("status = %d, encoding = %q", rec.Code, rec.Header().Get(echo.HeaderContentEncoding))
	}
	if ct := rec.Header().Get(echo.HeaderContentType); !strings.Contains(ct, "javascript") {
		t.Errorf("Content-Type = %q", ct)
	}

	rec = get(e, "/favicon.png", true)
	if rec.Header().Get(echo.HeaderContentEncoding) != "" {
		t.Error("uncompressed asset should not get Content-Encoding")
	}
	if rec.Body.String() != "png-bytes" {
		t.Errorf("body = %q", rec.Body.String())
	}
}

func TestStaticSPA_FallbackAndRoutes(t *testing.T) {
	e := testApp(t)

	if rec := get(e, "/statistics", false); rec.Body.String() != "<html>spa</html>" {
		t.Errorf("SPA route body = %q, want index.html", rec.Body.String())
	}
	if rec := get(e, "/health", false); rec.Body.String() != "ok" {
		t.Errorf("/health body = %q, want ok", rec.Body.String())
	}
	if rec := get(e, "/api/status", false); rec.Body.String() != "api" {
		t.Errorf("/api/status body = %q, want api", rec.Body.String())
	}
	if rec := get(e, "/api/nope", false); rec.Code != http.StatusNotFound {
		t.Errorf("/api/nope status = %d, want 404", rec.Code)
	}
}
