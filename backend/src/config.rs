use std::env;

#[derive(Debug, thiserror::Error)]
pub enum ConfigError {
    #[error("invalid PORT {0:?}: must be numeric")]
    InvalidPort(String),
}

pub struct Config {
    pub host: String,
    pub port: u16,
    pub dish_address: String,
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
    })
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
}
