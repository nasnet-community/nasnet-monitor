use std::sync::Mutex;
use std::time::{Duration, Instant};

use serde::{Deserialize, Serialize};

const DEFAULT_RELEASE_URL: &str =
    "https://api.github.com/repos/nasnet-community/nasnet-monitor/releases/latest";
const UPDATE_CACHE_TTL: Duration = Duration::from_secs(6 * 60 * 60);
const UPDATE_FETCH_LIMIT: Duration = Duration::from_secs(10);

#[derive(Debug, thiserror::Error)]
pub enum UpdateError {
    #[error("fetching latest release: {0}")]
    Fetch(String),
    #[error("github returned {0}")]
    UnexpectedStatus(u16),
    #[error("decoding release: {0}")]
    Decode(String),
    #[error("update check task: {0}")]
    Task(#[from] tokio::task::JoinError),
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateCheck {
    pub current_version: String,
    #[serde(skip_serializing_if = "String::is_empty")]
    pub latest_version: String,
    pub update_available: bool,
    #[serde(skip_serializing_if = "String::is_empty")]
    pub release_url: String,
}

impl UpdateCheck {
    fn none(version: &str) -> Self {
        Self {
            current_version: version.to_string(),
            latest_version: String::new(),
            update_available: false,
            release_url: String::new(),
        }
    }
}

/// Checks GitHub for a newer release, caching the result for six hours.
pub struct UpdateService {
    version: &'static str,
    release_url: String,
    cache: Mutex<Option<(Instant, UpdateCheck)>>,
}

#[derive(Deserialize)]
struct GithubRelease {
    #[serde(default)]
    tag_name: String,
    #[serde(default)]
    html_url: String,
}

impl UpdateService {
    pub fn new(version: &'static str) -> Self {
        Self {
            version,
            // Overridable for testing against a local mock.
            release_url: std::env::var("RELEASE_URL")
                .unwrap_or_else(|_| DEFAULT_RELEASE_URL.to_string()),
            cache: Mutex::new(None),
        }
    }

    pub async fn check(&self) -> Result<UpdateCheck, UpdateError> {
        if let Some((fetched_at, cached)) = self.cache.lock().unwrap().as_ref() {
            if fetched_at.elapsed() < UPDATE_CACHE_TTL {
                return Ok(cached.clone());
            }
        }

        let version = self.version;
        let url = self.release_url.clone();
        // ureq is a blocking client; run it off the async runtime.
        let result = tokio::task::spawn_blocking(move || fetch(&url, version)).await??;

        *self.cache.lock().unwrap() = Some((Instant::now(), result.clone()));
        Ok(result)
    }
}

fn fetch(url: &str, version: &str) -> Result<UpdateCheck, UpdateError> {
    let agent = ureq::AgentBuilder::new()
        .timeout(UPDATE_FETCH_LIMIT)
        .build();
    let response = agent
        .get(url)
        .set("Accept", "application/vnd.github+json")
        .call();

    let release: GithubRelease = match response {
        Ok(res) => res
            .into_json()
            .map_err(|e| UpdateError::Decode(e.to_string()))?,
        // 404 means the repo has no (non-prerelease) releases yet.
        Err(ureq::Error::Status(404, _)) => return Ok(UpdateCheck::none(version)),
        Err(ureq::Error::Status(code, _)) => return Err(UpdateError::UnexpectedStatus(code)),
        Err(e) => return Err(UpdateError::Fetch(e.to_string())),
    };

    let latest = release.tag_name.trim_start_matches('v').to_string();
    Ok(UpdateCheck {
        current_version: version.to_string(),
        update_available: newer_version(version, &latest),
        latest_version: latest,
        release_url: release.html_url,
    })
}

/// Whether `latest` is a strictly newer semver than `current`. Unparseable
/// versions never report an update, matching the Go backend.
fn newer_version(current: &str, latest: &str) -> bool {
    match (
        semver::Version::parse(current),
        semver::Version::parse(latest),
    ) {
        (Ok(current), Ok(latest)) => latest > current,
        _ => false,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn newer_version_compares_semver() {
        assert!(newer_version("0.1.0", "0.2.0"));
        assert!(newer_version("0.1.0", "1.0.0"));
        assert!(!newer_version("0.2.0", "0.2.0"));
        assert!(!newer_version("0.3.0", "0.2.9"));
    }

    #[test]
    fn newer_version_rejects_invalid_input() {
        assert!(!newer_version("not-a-version", "0.2.0"));
        assert!(!newer_version("0.1.0", "latest"));
    }

    #[test]
    fn update_check_omits_empty_fields() {
        let body = serde_json::to_string(&UpdateCheck::none("0.1.0")).unwrap();
        assert_eq!(
            body,
            "{\"currentVersion\":\"0.1.0\",\"updateAvailable\":false}"
        );
    }
}
