use std::sync::Arc;
use std::time::Instant;

use axum::body::Bytes;
use axum::extract::{Query, Request, State};
use axum::http::{HeaderMap, HeaderName, StatusCode};
use axum::middleware::Next;
use axum::response::{IntoResponse, Response};
use axum::Json;
use serde::{Deserialize, Serialize};
use serde_json::value::RawValue;
use tonic::Code;

use crate::starlink::DishError;
use crate::{AppState, VERSION};

pub const DISH_ADDRESS_HEADER: HeaderName = HeaderName::from_static("x-dish-address");

type AppStateRef = State<Arc<AppState>>;
type ApiResult = Result<Response, ApiError>;

/// JSON envelope shared by every API response, matching the Go backend:
/// `{"status": ..., "message": ..., "data"?: ..., "error"?: ...}`.
#[derive(Serialize)]
struct Envelope<T: Serialize> {
    status: u16,
    message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    data: Option<T>,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<String>,
}

/// A user-facing API error; renders as an error envelope.
pub struct ApiError {
    status: StatusCode,
    message: String,
    detail: Option<String>,
}

impl ApiError {
    fn new(status: StatusCode, message: impl Into<String>) -> Self {
        Self {
            status,
            message: message.into(),
            detail: None,
        }
    }

    fn with_detail(
        status: StatusCode,
        message: impl Into<String>,
        detail: impl Into<String>,
    ) -> Self {
        Self {
            status,
            message: message.into(),
            detail: Some(detail.into()),
        }
    }
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        (
            self.status,
            Json(Envelope::<()> {
                status: self.status.as_u16(),
                message: self.message,
                data: None,
                error: self.detail.filter(|d| !d.is_empty()),
            }),
        )
            .into_response()
    }
}

impl From<DishError> for ApiError {
    fn from(err: DishError) -> Self {
        eprintln!("dish request failed: {err}");
        let (status, message) = classify_dish_error(&err);
        Self::new(status, message)
    }
}

fn ok<T: Serialize>(data: T) -> Response {
    (
        StatusCode::OK,
        Json(Envelope {
            status: StatusCode::OK.as_u16(),
            message: "ok".to_string(),
            data: Some(data),
            error: None,
        }),
    )
        .into_response()
}

/// Wrap pre-serialized JSON (a dish response) in a success envelope without
/// re-parsing it.
fn ok_raw(raw: String) -> ApiResult {
    let data = RawValue::from_string(raw).map_err(|e| {
        ApiError::with_detail(
            StatusCode::INTERNAL_SERVER_ERROR,
            "encode response",
            e.to_string(),
        )
    })?;
    Ok(ok(data))
}

/// echo-style JSON 404 for unmatched `/api` routes.
pub async fn not_found() -> Response {
    (
        StatusCode::NOT_FOUND,
        [(http::header::CONTENT_TYPE, "application/json")],
        "{\"message\":\"Not Found\"}",
    )
        .into_response()
}

pub async fn log_requests(req: Request, next: Next) -> Response {
    let method = req.method().clone();
    let uri = req.uri().clone();
    let start = Instant::now();
    let res = next.run(req).await;
    println!(
        "{} {} {} {:?}",
        method,
        uri,
        res.status().as_u16(),
        start.elapsed()
    );
    res
}

// --- health / status / update ---

#[derive(Serialize)]
struct HealthResponse {
    status: &'static str,
    server: &'static str,
}

pub async fn health() -> Response {
    Json(HealthResponse {
        status: "healthy",
        server: "nasnet-monitor",
    })
    .into_response()
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct StatusResponse {
    service: &'static str,
    version: &'static str,
    uptime_seconds: u64,
}

pub async fn status(State(state): AppStateRef) -> Response {
    ok(StatusResponse {
        service: "nasnet-monitor",
        version: VERSION,
        uptime_seconds: state.start.elapsed().as_secs(),
    })
}

pub async fn update_check(State(state): AppStateRef) -> ApiResult {
    let result = state.update.check().await.map_err(|e| {
        ApiError::with_detail(
            StatusCode::BAD_GATEWAY,
            "update check failed",
            e.to_string(),
        )
    })?;
    Ok(ok(result))
}

// --- dish ---

fn dish_addr<'a>(state: &'a AppState, headers: &'a HeaderMap) -> &'a str {
    headers
        .get(&DISH_ADDRESS_HEADER)
        .and_then(|v| v.to_str().ok())
        .filter(|v| !v.is_empty())
        .unwrap_or_else(|| state.dish.default_address())
}

/// Map gRPC failure codes to user-facing HTTP errors, mirroring the Go
/// backend's `classifyDishError`.
fn classify_dish_error(err: &DishError) -> (StatusCode, String) {
    let status = match err {
        DishError::Rpc(status) => status,
        DishError::Protocol(_) => {
            return (
                StatusCode::BAD_GATEWAY,
                "Couldn't reach the device. Check the address and your network connection."
                    .to_string(),
            )
        }
    };
    match status.code() {
        Code::DeadlineExceeded => (
            StatusCode::GATEWAY_TIMEOUT,
            "The device didn't respond in time. Make sure it's powered on and reachable on your network.".to_string(),
        ),
        Code::Unavailable => (
            StatusCode::BAD_GATEWAY,
            "Couldn't connect to the device. Check the address and your network connection.".to_string(),
        ),
        Code::Unimplemented => (
            StatusCode::BAD_GATEWAY,
            "This device doesn't support that request — you may be connected to the wrong device (e.g. the dish vs the router).".to_string(),
        ),
        Code::PermissionDenied => (
            StatusCode::FORBIDDEN,
            "The device refused this request. Some Wi-Fi management actions are only allowed from the official Starlink app.".to_string(),
        ),
        Code::FailedPrecondition => match status.message().trim() {
            "" => (
                StatusCode::CONFLICT,
                "The device can't do that in its current state.".to_string(),
            ),
            reason => (
                StatusCode::CONFLICT,
                format!("The device can't do that right now: {reason}."),
            ),
        },
        _ => (
            StatusCode::BAD_GATEWAY,
            "The request to the device failed. Please try again.".to_string(),
        ),
    }
}

async fn dish_op(
    state: &AppState,
    headers: &HeaderMap,
    oneof_key: &str,
    payload: Option<&RawValue>,
) -> ApiResult {
    let addr = dish_addr(state, headers);
    let data = state.dish.call(addr, oneof_key, payload).await?;
    ok_raw(data)
}

pub async fn dish_status(State(state): AppStateRef, headers: HeaderMap) -> ApiResult {
    dish_op(&state, &headers, "get_status", None).await
}

pub async fn dish_device_info(State(state): AppStateRef, headers: HeaderMap) -> ApiResult {
    dish_op(&state, &headers, "get_device_info", None).await
}

pub async fn dish_history(State(state): AppStateRef, headers: HeaderMap) -> ApiResult {
    dish_op(&state, &headers, "get_history", None).await
}

pub async fn dish_obstruction_map(State(state): AppStateRef, headers: HeaderMap) -> ApiResult {
    dish_op(&state, &headers, "dish_get_obstruction_map", None).await
}

pub async fn dish_get_config(State(state): AppStateRef, headers: HeaderMap) -> ApiResult {
    dish_op(&state, &headers, "dish_get_config", None).await
}

pub async fn dish_reboot(State(state): AppStateRef, headers: HeaderMap) -> ApiResult {
    dish_op(&state, &headers, "reboot", None).await
}

pub async fn dish_clear_obstruction_map(
    State(state): AppStateRef,
    headers: HeaderMap,
) -> ApiResult {
    dish_op(&state, &headers, "dish_clear_obstruction_map", None).await
}

/// Parse an optional JSON body; an empty body yields the default, matching
/// echo's `Bind` behaviour in the Go backend.
fn parse_body<T: Default + for<'de> Deserialize<'de>>(body: &Bytes) -> Result<T, ApiError> {
    if body.is_empty() {
        return Ok(T::default());
    }
    serde_json::from_slice(body).map_err(|e| {
        ApiError::with_detail(
            StatusCode::BAD_REQUEST,
            "invalid request body",
            e.to_string(),
        )
    })
}

#[derive(Default, Deserialize)]
struct DishStowRequest {
    #[serde(default)]
    unstow: bool,
}

pub async fn dish_stow(State(state): AppStateRef, headers: HeaderMap, body: Bytes) -> ApiResult {
    let req: DishStowRequest = parse_body(&body)?;
    let payload = serde_json::value::to_raw_value(&serde_json::json!({ "unstow": req.unstow }))
        .map_err(|e| {
            ApiError::with_detail(
                StatusCode::INTERNAL_SERVER_ERROR,
                "encode stow payload",
                e.to_string(),
            )
        })?;
    dish_op(&state, &headers, "dish_stow", Some(&payload)).await
}

#[derive(Default, Deserialize)]
struct DishConfigRequest {
    config: Option<Box<RawValue>>,
}

pub async fn dish_set_config(
    State(state): AppStateRef,
    headers: HeaderMap,
    body: Bytes,
) -> ApiResult {
    let req: DishConfigRequest = parse_body(&body)?;
    let config = req
        .config
        .ok_or_else(|| ApiError::new(StatusCode::BAD_REQUEST, "config is required"))?;
    dish_op(&state, &headers, "dish_set_config", Some(&config)).await
}

#[derive(Default, Deserialize)]
struct DishHandleRequest {
    request: Option<Box<RawValue>>,
}

pub async fn dish_handle(State(state): AppStateRef, headers: HeaderMap, body: Bytes) -> ApiResult {
    let req: DishHandleRequest = parse_body(&body)?;
    let request = req
        .request
        .ok_or_else(|| ApiError::new(StatusCode::BAD_REQUEST, "request is required"))?;
    let addr = dish_addr(&state, &headers);
    let data = state.dish.invoke(addr, &request).await?;
    ok_raw(data)
}

#[derive(Deserialize)]
pub struct DescribeParams {
    request: Option<String>,
}

pub async fn dish_describe(
    State(state): AppStateRef,
    headers: HeaderMap,
    Query(params): Query<DescribeParams>,
) -> ApiResult {
    let addr = dish_addr(&state, &headers);
    match params.request.as_deref().filter(|r| !r.is_empty()) {
        Some(oneof) => Ok(ok(state.dish.describe_request(addr, oneof).await?)),
        None => Ok(ok(state.dish.describe(addr).await?)),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tonic::Status;

    fn classify(status: Status) -> (StatusCode, String) {
        classify_dish_error(&DishError::Rpc(status))
    }

    #[test]
    fn classifies_grpc_codes_like_go() {
        assert_eq!(
            classify(Status::deadline_exceeded("late")).0,
            StatusCode::GATEWAY_TIMEOUT
        );
        assert_eq!(
            classify(Status::unavailable("down")).0,
            StatusCode::BAD_GATEWAY
        );
        assert_eq!(
            classify(Status::unimplemented("nope")).0,
            StatusCode::BAD_GATEWAY
        );
        assert_eq!(
            classify(Status::permission_denied("no")).0,
            StatusCode::FORBIDDEN
        );
        assert_eq!(
            classify(Status::internal("boom")).0,
            StatusCode::BAD_GATEWAY
        );
    }

    #[test]
    fn failed_precondition_includes_reason() {
        let (status, message) = classify(Status::failed_precondition("dish is stowed"));
        assert_eq!(status, StatusCode::CONFLICT);
        assert_eq!(
            message,
            "The device can't do that right now: dish is stowed."
        );
        let (_, message) = classify(Status::failed_precondition(""));
        assert_eq!(message, "The device can't do that in its current state.");
    }

    #[test]
    fn protocol_errors_read_as_unreachable() {
        let (status, _) = classify_dish_error(&DishError::Protocol("dial tcp".to_string()));
        assert_eq!(status, StatusCode::BAD_GATEWAY);
    }

    #[test]
    fn envelope_omits_empty_fields() {
        let body = serde_json::to_string(&Envelope::<()> {
            status: 400,
            message: "config is required".to_string(),
            data: None,
            error: None,
        })
        .unwrap();
        assert_eq!(body, "{\"status\":400,\"message\":\"config is required\"}");
    }
}
