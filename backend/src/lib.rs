pub mod api;
pub mod config;
pub mod spa;
pub mod starlink;
pub mod update;

use std::sync::Arc;
use std::time::Instant;

use axum::{routing::get, routing::post, Router};
use http::header::{ACCEPT, AUTHORIZATION, CONTENT_TYPE, ORIGIN};
use http::Method;
use tower_http::cors::{Any, CorsLayer};

pub const VERSION: &str = match option_env!("APP_VERSION") {
    Some(v) => v,
    None => "0.1.0",
};

pub struct AppState {
    pub start: Instant,
    pub dish: starlink::DishService,
    pub update: update::UpdateService,
}

impl AppState {
    pub fn new(dish_address: String) -> Arc<Self> {
        Arc::new(Self {
            start: Instant::now(),
            dish: starlink::DishService::new(dish_address),
            update: update::UpdateService::new(VERSION),
        })
    }
}

/// Build the complete application router: API routes, embedded SPA, CORS,
/// and request logging.
pub fn router(state: Arc<AppState>, base_path: &str) -> Router {
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods([
            Method::GET,
            Method::HEAD,
            Method::PUT,
            Method::PATCH,
            Method::POST,
            Method::DELETE,
        ])
        .allow_headers([
            ORIGIN,
            CONTENT_TYPE,
            ACCEPT,
            AUTHORIZATION,
            api::DISH_ADDRESS_HEADER,
        ]);

    let dish_routes = Router::new()
        .route("/status", post(api::dish_status))
        .route("/device-info", post(api::dish_device_info))
        .route("/history", post(api::dish_history))
        .route("/obstruction-map", post(api::dish_obstruction_map))
        .route("/get-config", post(api::dish_get_config))
        .route("/set-config", post(api::dish_set_config))
        .route("/reboot", post(api::dish_reboot))
        .route("/stow", post(api::dish_stow))
        .route(
            "/clear-obstruction-map",
            post(api::dish_clear_obstruction_map),
        )
        .route("/handle", post(api::dish_handle))
        .route("/describe", post(api::dish_describe));

    let api_routes = Router::new()
        .route("/status", get(api::status))
        .route("/update-check", get(api::update_check))
        .nest("/dish", dish_routes)
        .fallback(api::not_found);

    let routes = Router::new()
        .route("/health", get(api::health))
        .nest("/api", api_routes)
        .with_state(state)
        .merge(spa::router(base_path));

    let app = if base_path.is_empty() {
        routes
    } else {
        Router::new().nest(base_path, routes)
    };

    app.layer(axum::middleware::from_fn(api::log_requests))
        .layer(cors)
}
