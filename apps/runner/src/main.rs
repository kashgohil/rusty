use axum::{
    Json, Router,
    extract::State,
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
};
use serde::{Deserialize, Serialize};
use std::{
    net::SocketAddr,
    path::Path,
    time::{Duration, SystemTime, UNIX_EPOCH},
};
use tempfile::tempdir;
use tokio::{
    fs,
    net::TcpListener,
    process::Command,
    time::{error::Elapsed, timeout},
};
use tower_http::cors::CorsLayer;

const DEFAULT_PORT: u16 = 9091;
const EXECUTION_TIMEOUT_SECS: u64 = 6;

#[derive(Clone)]
struct AppState {
    execution_timeout: Duration,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ExecutionRequest {
    lesson_slug: String,
    file_name: String,
    code: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ExecutionResult {
    status: ExecutionStatus,
    headline: String,
    output: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
enum ExecutionStatus {
    Success,
    Error,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct HealthResponse {
    status: &'static str,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let port = std::env::var("RUNNER_PORT")
        .ok()
        .and_then(|value| value.parse::<u16>().ok())
        .unwrap_or(DEFAULT_PORT);

    let state = AppState {
        execution_timeout: Duration::from_secs(EXECUTION_TIMEOUT_SECS),
    };

    let app = Router::new()
        .route("/health", get(health))
        .route("/run", post(run_code))
        .layer(CorsLayer::permissive())
        .with_state(state);

    let addr = SocketAddr::from(([127, 0, 0, 1], port));
    let listener = TcpListener::bind(addr).await?;

    println!("rust-learning runner listening on http://{addr}");

    axum::serve(listener, app).await?;

    Ok(())
}

async fn health() -> Json<HealthResponse> {
    Json(HealthResponse { status: "ok" })
}

async fn run_code(
    State(state): State<AppState>,
    Json(payload): Json<ExecutionRequest>,
) -> Result<Json<ExecutionResult>, RunnerError> {
    if payload.code.trim().is_empty() {
        return Ok(Json(ExecutionResult {
            status: ExecutionStatus::Error,
            headline: "No code to compile".to_string(),
            output: "The file is empty. Restore the starter or write a small Rust program first."
                .to_string(),
        }));
    }

    let result = execute_rust_program(&payload, state.execution_timeout).await?;

    Ok(Json(result))
}

async fn execute_rust_program(
    payload: &ExecutionRequest,
    execution_timeout: Duration,
) -> Result<ExecutionResult, RunnerError> {
    let temp_dir = tempdir().map_err(RunnerError::internal)?;
    let workspace = temp_dir.path();
    let source_path = workspace.join("src").join(normalize_file_name(&payload.file_name));

    fs::create_dir_all(workspace.join("src"))
        .await
        .map_err(RunnerError::internal)?;
    fs::write(workspace.join("Cargo.toml"), cargo_manifest(&payload.lesson_slug))
        .await
        .map_err(RunnerError::internal)?;
    fs::write(&source_path, &payload.code)
        .await
        .map_err(RunnerError::internal)?;

    let mut command = Command::new("cargo");
    command.arg("run").arg("--quiet").current_dir(workspace);

    let output = timeout(execution_timeout, command.output())
        .await
        .map_err(RunnerError::timeout)?
        .map_err(RunnerError::internal)?;

    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();

    if output.status.success() {
        let rendered_output = if stdout.is_empty() {
            "Program completed successfully with no stdout.".to_string()
        } else {
            stdout
        };

        return Ok(ExecutionResult {
            status: ExecutionStatus::Success,
            headline: "Runner executed successfully".to_string(),
            output: rendered_output,
        });
    }

    let combined_output = if stderr.is_empty() {
        "Rust execution failed with no stderr output.".to_string()
    } else if stdout.is_empty() {
        stderr
    } else {
        format!("{stderr}\n\nstdout:\n{stdout}")
    };

    Ok(ExecutionResult {
        status: ExecutionStatus::Error,
        headline: "Runner returned a compile or runtime error".to_string(),
        output: combined_output,
    })
}

fn cargo_manifest(lesson_slug: &str) -> String {
    format!(
        r#"[package]
name = "lesson-{slug}"
version = "0.1.0"
edition = "2024"

[dependencies]
"#,
        slug = sanitize_package_name(lesson_slug)
    )
}

fn normalize_file_name(file_name: &str) -> &str {
    let candidate = Path::new(file_name)
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("main.rs");

    if candidate.is_empty() { "main.rs" } else { candidate }
}

fn sanitize_package_name(input: &str) -> String {
    let mut rendered = String::with_capacity(input.len());

    for char in input.chars() {
        if char.is_ascii_alphanumeric() {
            rendered.push(char.to_ascii_lowercase());
        } else {
            rendered.push('-');
        }
    }

    let rendered = rendered.trim_matches('-');

    if rendered.is_empty() {
        format!(
            "lesson-{}",
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs()
        )
    } else {
        rendered.to_string()
    }
}

struct RunnerError {
    status: StatusCode,
    message: String,
}

impl RunnerError {
    fn internal(error: impl std::fmt::Display) -> Self {
        Self {
            status: StatusCode::INTERNAL_SERVER_ERROR,
            message: format!("Runner internal error: {error}"),
        }
    }

    fn timeout(_: Elapsed) -> Self {
        Self {
            status: StatusCode::REQUEST_TIMEOUT,
            message: format!(
                "Execution timed out after {EXECUTION_TIMEOUT_SECS} seconds. Infinite loops and hanging reads are cut off."
            ),
        }
    }
}

impl IntoResponse for RunnerError {
    fn into_response(self) -> axum::response::Response {
        let body = Json(ExecutionResult {
            status: ExecutionStatus::Error,
            headline: "Runner request failed".to_string(),
            output: self.message,
        });

        (self.status, body).into_response()
    }
}
