//! Integration tests against an in-process mock dish: a tonic server exposing
//! gRPC reflection (v1 + v1alpha) and a dynamic `SpaceX.API.Device.Device/Handle`
//! returning a canned response — a port of the Go backend's mock_test.go.

mod mock_dish;

use nasnet_monitor::starlink::{DishError, DishService};

async fn mock_service() -> (DishService, String) {
    let addr = mock_dish::spawn().await;
    (DishService::new(addr.clone()), addr)
}

#[tokio::test]
async fn invoke_get_status_returns_canned_response() {
    let (dish, addr) = mock_service().await;
    let data = dish.call(&addr, "get_status", None).await.unwrap();
    let value: serde_json::Value = serde_json::from_str(&data).unwrap();
    assert_eq!(value["getStatus"]["id"], "dishy-test");
    assert_eq!(value["getStatus"]["hardwareVersion"], "rev3_proto3");
}

#[tokio::test]
async fn invoke_uses_default_address_when_blank() {
    let (dish, _) = mock_service().await;
    let data = dish.call("", "get_status", None).await.unwrap();
    assert!(data.contains("dishy-test"));
}

#[tokio::test]
async fn invoke_rejects_unknown_oneof() {
    let (dish, addr) = mock_service().await;
    let err = dish.call(&addr, "not_a_request", None).await.unwrap_err();
    match err {
        DishError::Protocol(msg) => assert!(msg.contains("prepare request"), "got: {msg}"),
        DishError::Rpc(status) => panic!("expected protocol error, got rpc: {status}"),
    }
}

#[tokio::test]
async fn describe_lists_methods_and_requests() {
    let (dish, addr) = mock_service().await;
    let schema = dish.describe(&addr).await.unwrap();
    assert_eq!(schema.service, "SpaceX.API.Device.Device");
    assert_eq!(schema.methods, vec!["Handle"]);
    assert_eq!(schema.requests, vec!["get_status"]);
}

#[tokio::test]
async fn describe_request_expands_message() {
    let (dish, addr) = mock_service().await;
    let info = dish.describe_request(&addr, "get_status").await.unwrap();
    assert_eq!(info.name, "SpaceX.API.Device.GetStatusRequest");
    assert!(info.fields.is_empty());
}

#[tokio::test]
async fn describe_request_rejects_unknown_field() {
    let (dish, addr) = mock_service().await;
    let err = dish
        .describe_request(&addr, "warp_drive")
        .await
        .unwrap_err();
    assert!(err.to_string().contains("unknown request"));
}

#[tokio::test]
async fn unreachable_address_maps_to_unavailable() {
    let (dish, _) = mock_service().await;
    let err = dish
        .call("127.0.0.1:1", "get_status", None)
        .await
        .unwrap_err();
    match err {
        DishError::Rpc(status) => assert_eq!(status.code(), tonic::Code::Unavailable),
        DishError::Protocol(msg) => panic!("expected rpc error, got: {msg}"),
    }
}

mod http_api {
    use super::*;
    use axum::body::Body;
    use http::{Request, StatusCode};
    use http_body_util::BodyExt;
    use nasnet_monitor::{router, AppState};
    use tower::ServiceExt;

    async fn call(
        app: axum::Router,
        method: &str,
        uri: &str,
        body: Option<&str>,
    ) -> (StatusCode, String) {
        let req = Request::builder()
            .method(method)
            .uri(uri)
            .header("content-type", "application/json")
            .body(body.map(|b| Body::from(b.to_string())).unwrap_or_default())
            .unwrap();
        let res = app.oneshot(req).await.unwrap();
        let status = res.status();
        let bytes = res.into_body().collect().await.unwrap().to_bytes();
        (status, String::from_utf8_lossy(&bytes).into_owned())
    }

    #[tokio::test]
    async fn dish_status_returns_envelope() {
        let addr = mock_dish::spawn().await;
        let app = router(AppState::new(addr));
        let (status, body) = call(app, "POST", "/api/dish/status", None).await;
        assert_eq!(status, StatusCode::OK);
        let value: serde_json::Value = serde_json::from_str(&body).unwrap();
        assert_eq!(value["status"], 200);
        assert_eq!(value["message"], "ok");
        assert_eq!(value["data"]["getStatus"]["id"], "dishy-test");
    }

    #[tokio::test]
    async fn health_and_api_not_found() {
        let addr = mock_dish::spawn().await;
        let app = router(AppState::new(addr));
        let (status, body) = call(app.clone(), "GET", "/health", None).await;
        assert_eq!(status, StatusCode::OK);
        assert_eq!(
            body,
            "{\"status\":\"healthy\",\"server\":\"nasnet-monitor\"}"
        );

        let (status, body) = call(app, "GET", "/api/nope", None).await;
        assert_eq!(status, StatusCode::NOT_FOUND);
        assert_eq!(body, "{\"message\":\"Not Found\"}");
    }

    #[tokio::test]
    async fn set_config_requires_config() {
        let addr = mock_dish::spawn().await;
        let app = router(AppState::new(addr));
        let (status, body) = call(app, "POST", "/api/dish/set-config", Some("{}")).await;
        assert_eq!(status, StatusCode::BAD_REQUEST);
        assert!(body.contains("config is required"));
    }

    #[tokio::test]
    async fn spa_serves_index_for_unknown_routes() {
        let addr = mock_dish::spawn().await;
        let app = router(AppState::new(addr));
        let (status, body) = call(app, "GET", "/somewhere/deep", None).await;
        assert_eq!(status, StatusCode::OK);
        assert!(body.contains("<!doctype html>") || body.contains("<html"));
    }

    #[tokio::test]
    async fn unreachable_dish_maps_to_bad_gateway() {
        let app = router(AppState::new("127.0.0.1:1".to_string()));
        let (status, body) = call(app, "POST", "/api/dish/status", None).await;
        assert_eq!(status, StatusCode::BAD_GATEWAY);
        assert!(body.contains("Couldn't connect to the device"));
    }
}
