package service

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"sync"
	"time"

	"golang.org/x/mod/semver"
)

const (
	defaultReleaseURL = "https://api.github.com/repos/nasnet-community/nasnet-monitor/releases/latest"
	updateCacheTTL    = 6 * time.Hour
	updateFetchLimit  = 10 * time.Second
)

type UpdateCheck struct {
	CurrentVersion  string `json:"currentVersion"`
	LatestVersion   string `json:"latestVersion,omitempty"`
	UpdateAvailable bool   `json:"updateAvailable"`
	ReleaseURL      string `json:"releaseUrl,omitempty"`
}

type UpdateService struct {
	version    string
	releaseURL string
	client     *http.Client

	mu        sync.Mutex
	cached    *UpdateCheck
	fetchedAt time.Time
}

func NewUpdateService(version string) *UpdateService {
	return &UpdateService{
		version:    version,
		releaseURL: defaultReleaseURL,
		client:     &http.Client{Timeout: updateFetchLimit},
	}
}

func (s *UpdateService) Check(ctx context.Context) (*UpdateCheck, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.cached != nil && time.Since(s.fetchedAt) < updateCacheTTL {
		return s.cached, nil
	}

	result, err := s.fetch(ctx)
	if err != nil {
		return nil, err
	}
	s.cached = result
	s.fetchedAt = time.Now()
	return result, nil
}

type githubRelease struct {
	TagName string `json:"tag_name"`
	HTMLURL string `json:"html_url"`
}

func (s *UpdateService) fetch(ctx context.Context) (*UpdateCheck, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, s.releaseURL, http.NoBody)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Accept", "application/vnd.github+json")

	res, err := s.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("fetching latest release: %w", err)
	}
	defer func() { _ = res.Body.Close() }()

	// 404 means the repo has no (non-prerelease) releases yet.
	if res.StatusCode == http.StatusNotFound {
		return &UpdateCheck{CurrentVersion: s.version}, nil
	}
	if res.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("github returned %d", res.StatusCode)
	}

	var release githubRelease
	if err := json.NewDecoder(res.Body).Decode(&release); err != nil {
		return nil, fmt.Errorf("decoding release: %w", err)
	}

	latest := strings.TrimPrefix(release.TagName, "v")
	return &UpdateCheck{
		CurrentVersion:  s.version,
		LatestVersion:   latest,
		UpdateAvailable: newerVersion(s.version, latest),
		ReleaseURL:      release.HTMLURL,
	}, nil
}

func newerVersion(current, latest string) bool {
	c, l := "v"+current, "v"+latest
	if !semver.IsValid(c) || !semver.IsValid(l) {
		return false
	}
	return semver.Compare(l, c) > 0
}
