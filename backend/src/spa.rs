use std::sync::Arc;

use axum::body::Body;
use axum::extract::State;
use axum::http::header::{CACHE_CONTROL, CONTENT_TYPE};
use axum::http::{HeaderValue, Request, StatusCode};
use axum::middleware::Next;
use axum::response::{IntoResponse, Response};
use axum::Router;

const INDEX_HTML: &str = include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/dist/index.html"));

const HEAD_TAG: &str = "<head>";

pub fn router(base_path: &str) -> Router {
    let index = Arc::new(render_index(INDEX_HTML, base_path));

    memory_serve::load!()
        .index_file(Some("/index.html"))
        .fallback(Some("/index.html"))
        .fallback_status(StatusCode::OK)
        .into_router()
        .layer(axum::middleware::from_fn_with_state(index, serve_index))
}

async fn serve_index(
    State(index): State<Arc<String>>,
    request: Request<Body>,
    next: Next,
) -> Response {
    let response = next.run(request).await;

    let is_html = response
        .headers()
        .get(CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .is_some_and(|value| value.starts_with("text/html"));
    if !is_html {
        return response;
    }

    (
        response.status(),
        [
            (
                CONTENT_TYPE,
                HeaderValue::from_static("text/html; charset=utf-8"),
            ),
            (CACHE_CONTROL, HeaderValue::from_static("no-store")),
        ],
        index.as_str().to_owned(),
    )
        .into_response()
}

fn render_index(html: &str, base_path: &str) -> String {
    let href = format!("{base_path}/");
    let injected = format!(
        "\n    <base href=\"{href}\" />\n    <script>window.__BASE_PATH__ = \"{base_path}\"</script>"
    );

    match html.find(HEAD_TAG) {
        Some(index) => {
            let at = index + HEAD_TAG.len();
            format!("{}{}{}", &html[..at], injected, &html[at..])
        }
        None => format!("{injected}{html}"),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const DOC: &str = "<!doctype html>\n<html>\n  <head>\n    <link href=\"./assets/a.css\" />\n  </head>\n</html>";

    #[test]
    fn root_base_path_anchors_relative_assets_at_the_root() {
        let html = render_index(DOC, "");
        assert!(html.contains("<base href=\"/\" />"));
        assert!(html.contains("window.__BASE_PATH__ = \"\""));
    }

    #[test]
    fn configured_base_path_is_injected_with_a_trailing_slash() {
        let html = render_index(DOC, "/api/plugin/view");
        assert!(html.contains("<base href=\"/api/plugin/view/\" />"));
        assert!(html.contains("window.__BASE_PATH__ = \"/api/plugin/view\""));
    }

    #[test]
    fn injection_precedes_the_first_asset_url() {
        let html = render_index(DOC, "/api/plugin/view");
        assert!(html.find("<base").unwrap() < html.find("./assets/a.css").unwrap());
    }

    #[test]
    fn document_without_head_still_gets_the_base_tag() {
        let html = render_index("<p>no head</p>", "/monitor");
        assert!(html.contains("<base href=\"/monitor/\" />"));
        assert!(html.contains("<p>no head</p>"));
    }
}
