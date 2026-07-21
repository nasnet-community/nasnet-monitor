package service

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
)

func newTestUpdateService(version string, srv *httptest.Server) *UpdateService {
	s := NewUpdateService(version)
	s.releaseURL = srv.URL
	s.client = srv.Client()
	return s
}

func releaseServer(t *testing.T, status int, tag string, hits *int) *httptest.Server {
	t.Helper()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		if hits != nil {
			*hits++
		}
		w.WriteHeader(status)
		if status == http.StatusOK {
			fmt.Fprintf(w, `{"tag_name":%q,"html_url":"https://example.com/release"}`, tag)
		}
	}))
	t.Cleanup(srv.Close)
	return srv
}

func TestUpdateService_Check(t *testing.T) {
	tests := []struct {
		name          string
		current, tag  string
		wantAvailable bool
		wantLatest    string
	}{
		{"newer release", "0.1.0", "v0.2.0", true, "0.2.0"},
		{"same version", "0.1.0", "v0.1.0", false, "0.1.0"},
		{"older release", "0.2.0", "v0.1.0", false, "0.1.0"},
		{"tag without v prefix", "0.1.0", "0.3.1", true, "0.3.1"},
		{"non-semver tag", "0.1.0", "snapshot", false, "snapshot"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			s := newTestUpdateService(tt.current, releaseServer(t, http.StatusOK, tt.tag, nil))
			got, err := s.Check(context.Background())
			if err != nil {
				t.Fatalf("Check: %v", err)
			}
			if got.UpdateAvailable != tt.wantAvailable {
				t.Errorf("UpdateAvailable = %v, want %v", got.UpdateAvailable, tt.wantAvailable)
			}
			if got.LatestVersion != tt.wantLatest {
				t.Errorf("LatestVersion = %q, want %q", got.LatestVersion, tt.wantLatest)
			}
			if got.CurrentVersion != tt.current {
				t.Errorf("CurrentVersion = %q, want %q", got.CurrentVersion, tt.current)
			}
		})
	}
}

func TestUpdateService_Check_NoReleases(t *testing.T) {
	s := newTestUpdateService("0.1.0", releaseServer(t, http.StatusNotFound, "", nil))
	got, err := s.Check(context.Background())
	if err != nil {
		t.Fatalf("Check: %v", err)
	}
	if got.UpdateAvailable || got.LatestVersion != "" {
		t.Errorf("want no update for 404, got %+v", got)
	}
}

func TestUpdateService_Check_ServerError(t *testing.T) {
	s := newTestUpdateService("0.1.0", releaseServer(t, http.StatusInternalServerError, "", nil))
	if _, err := s.Check(context.Background()); err == nil {
		t.Fatal("want error for 500 response")
	}
}

func TestUpdateService_Check_Caches(t *testing.T) {
	hits := 0
	s := newTestUpdateService("0.1.0", releaseServer(t, http.StatusOK, "v0.2.0", &hits))
	for range 3 {
		if _, err := s.Check(context.Background()); err != nil {
			t.Fatalf("Check: %v", err)
		}
	}
	if hits != 1 {
		t.Errorf("github hit %d times, want 1 (cached)", hits)
	}
}
