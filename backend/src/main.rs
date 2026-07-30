use nasnet_monitor::{config, router, AppState};
use tower::Layer;
use tower_http::normalize_path::NormalizePathLayer;

#[tokio::main]
async fn main() -> std::process::ExitCode {
    match run().await {
        Ok(()) => std::process::ExitCode::SUCCESS,
        Err(err) => {
            eprintln!("{err}");
            std::process::ExitCode::FAILURE
        }
    }
}

async fn run() -> Result<(), String> {
    let cfg = config::load().map_err(|e| format!("config: {e}"))?;

    let state = AppState::new(cfg.dish_address.clone());
    let app = NormalizePathLayer::trim_trailing_slash().layer(router(state));

    let addr = format!("{}:{}", cfg.host, cfg.port);
    let listener = tokio::net::TcpListener::bind(&addr)
        .await
        .map_err(|e| format!("bind {addr}: {e}"))?;

    print_startup_info(cfg.port);

    use axum::ServiceExt;
    axum::serve(
        listener,
        ServiceExt::<axum::extract::Request>::into_make_service(app),
    )
    .with_graceful_shutdown(shutdown_signal())
    .await
    .map_err(|e| format!("server error: {e}"))?;

    println!("server stopped");
    Ok(())
}

async fn shutdown_signal() {
    let ctrl_c = async {
        tokio::signal::ctrl_c().await.ok();
    };
    let terminate = async {
        tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
            .expect("install SIGTERM handler")
            .recv()
            .await;
    };
    tokio::select! {
        _ = ctrl_c => {},
        _ = terminate => {},
    }
    println!("shutting down...");
}

fn print_startup_info(port: u16) {
    println!();
    println!("╔════════════════════════════════════════════════════════════════╗");
    println!("║                      NASNET-MONITOR API                        ║");
    println!("║                Satellite-dish Monitoring Dashboard             ║");
    println!("╠════════════════════════════════════════════════════════════════╣");
    println!("║                                                                ║");
    println!("║  🚀 Server running at http://0.0.0.0:{port}                      ║");
    println!("║                                                                ║");
    println!("╚════════════════════════════════════════════════════════════════╝");
    println!();
}
