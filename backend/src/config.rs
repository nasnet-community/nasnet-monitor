use std::env;

#[derive(Debug, thiserror::Error)]
pub enum ConfigError {
    #[error("invalid PORT {0:?}: must be numeric")]
    InvalidPort(String),
    #[error("invalid BASE_PATH {0:?}: must be a path like /api/plugin/view")]
    InvalidBasePath(String),
}

pub struct Config {
    pub host: String,
    pub port: u16,
    pub dish_address: String,
    pub base_path: String,
}

/// Load configuration from the environment. The `ENVIRONMENT` variable is
/// accepted for compatibility with the deployment setup but not used, same as
/// the Go backend.
pub fn load() -> Result<Config, ConfigError> {
    let port = get_env("PORT", "8080");
    Ok(Config {
        host: get_env("HOST", "0.0.0.0"),
        port: port.parse().map_err(|_| ConfigError::InvalidPort(port))?,
        dish_address: get_env("DISH_ADDRESS", "192.168.100.1:9200"),
        base_path: normalize_base_path(&get_env("BASE_PATH", ""))?,
    })
}

pub fn normalize_base_path(raw: &str) -> Result<String, ConfigError> {
    let trimmed = raw.trim().trim_end_matches('/');
    let trimmed = trimmed.strip_prefix('/').unwrap_or(trimmed);
    if trimmed.is_empty() {
        return Ok(String::new());
    }

    let valid = trimmed.split('/').all(|segment| {
        !segment.is_empty()
            && segment
                .chars()
                .all(|c| c.is_ascii_alphanumeric() || matches!(c, '-' | '_' | '.' | '~'))
    });
    if !valid {
        return Err(ConfigError::InvalidBasePath(raw.to_string()));
    }

    Ok(format!("/{trimmed}"))
}

fn get_env(key: &str, fallback: &str) -> String {
    env::var(key).unwrap_or_else(|_| fallback.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_port_parses() {
        assert_eq!("8080".parse::<u16>().unwrap(), 8080);
    }

    #[test]
    fn invalid_port_message_matches_go() {
        let err = ConfigError::InvalidPort("abc".to_string());
        assert_eq!(err.to_string(), "invalid PORT \"abc\": must be numeric");
    }

    #[test]
    fn unset_base_path_stays_empty() {
        assert_eq!(normalize_base_path("").unwrap(), "");
        assert_eq!(normalize_base_path("   ").unwrap(), "");
        assert_eq!(normalize_base_path("/").unwrap(), "");
    }

    #[test]
    fn base_path_gets_leading_slash_and_no_trailing_slash() {
        assert_eq!(
            normalize_base_path("/api/plugin/view").unwrap(),
            "/api/plugin/view"
        );
        assert_eq!(
            normalize_base_path("api/plugin/view/").unwrap(),
            "/api/plugin/view"
        );
        assert_eq!(normalize_base_path(" /monitor/ ").unwrap(), "/monitor");
    }

    #[test]
    fn base_path_rejects_unsafe_values() {
        for raw in ["/app//proxy", "/app proxy", "/app\"/x", "/app/<script>"] {
            assert!(normalize_base_path(raw).is_err(), "accepted {raw:?}");
        }
    }
}
