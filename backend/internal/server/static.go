package server

import (
	"bytes"
	"compress/gzip"
	"errors"
	"fmt"
	"io/fs"
	"mime"
	"net/http"
	"path"
	"strings"

	"github.com/labstack/echo/v4"
)

func staticSPA(fsys fs.FS) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			r := c.Request()
			if r.Method != http.MethodGet && r.Method != http.MethodHead {
				return next(c)
			}
			if strings.HasPrefix(r.URL.Path, "/api/") {
				return next(c)
			}

			name := strings.TrimPrefix(path.Clean("/"+r.URL.Path), "/")
			if name == "" || name == "." {
				name = "index.html"
			}
			if err := serveAsset(c, fsys, name); !errors.Is(err, fs.ErrNotExist) {
				return err
			}

			err := next(c)
			var he *echo.HTTPError
			if err != nil && errors.As(err, &he) && he.Code == http.StatusNotFound {
				return serveAsset(c, fsys, "index.html")
			}
			return err
		}
	}
}

func serveAsset(c echo.Context, fsys fs.FS, name string) error {
	if data, err := fs.ReadFile(fsys, name+".gz"); err == nil {
		return sendGzipped(c, name, data)
	}
	st, err := fs.Stat(fsys, name)
	if err != nil {
		return err
	}
	if st.IsDir() {
		return fs.ErrNotExist
	}
	data, err := fs.ReadFile(fsys, name)
	if err != nil {
		return err
	}
	return c.Blob(http.StatusOK, contentType(name), data)
}

func sendGzipped(c echo.Context, name string, data []byte) error {
	res := c.Response()
	res.Header().Set(echo.HeaderVary, echo.HeaderAcceptEncoding)
	if strings.Contains(c.Request().Header.Get(echo.HeaderAcceptEncoding), "gzip") {
		res.Header().Set(echo.HeaderContentEncoding, "gzip")
		return c.Blob(http.StatusOK, contentType(name), data)
	}
	zr, err := gzip.NewReader(bytes.NewReader(data))
	if err != nil {
		return fmt.Errorf("read embedded %s.gz: %w", name, err)
	}
	defer func() { _ = zr.Close() }()
	return c.Stream(http.StatusOK, contentType(name), zr)
}

func contentType(name string) string {
	if t := mime.TypeByExtension(path.Ext(name)); t != "" {
		return t
	}
	return echo.MIMEOctetStream
}
