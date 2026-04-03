use axum::{
    Json, Router,
    extract::State,
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
};
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::{net::SocketAddr, path::PathBuf, time::Duration};
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
    entry_file: String,
    files: Vec<LessonFile>,
    mode: ExecutionMode,
    validation: LessonValidation,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct LessonFile {
    path: String,
    content: String,
}

#[derive(Debug, Deserialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
enum LessonValidation {
    Heuristic { checks: Vec<ExerciseCheck> },
    CargoTest {
        #[serde(rename = "testFiles")]
        test_files: Vec<LessonFile>,
    },
}

#[derive(Debug, Deserialize)]
struct ExerciseCheck {
    #[serde(rename = "type")]
    check_type: CheckType,
    value: String,
    message: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "snake_case")]
enum CheckType {
    Contains,
    NotContains,
    Regex,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ExecutionResult {
    status: ExecutionStatus,
    headline: String,
    output: String,
    passed: Option<bool>,
    checks: Option<Vec<CheckResult>>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
enum ExecutionStatus {
    Success,
    Error,
}

#[derive(Debug, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
enum ExecutionMode {
    Run,
    Check,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct CheckResult {
    passed: bool,
    message: String,
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
    if payload.files.is_empty() {
        return Ok(Json(ExecutionResult {
            status: ExecutionStatus::Error,
            headline: "No files to compile".to_string(),
            output: "The lesson request did not include any source files.".to_string(),
            passed: Some(false),
            checks: None,
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

    fs::write(
        workspace.join("Cargo.toml"),
        cargo_manifest(&payload.lesson_slug, &payload.entry_file),
    )
    .await
    .map_err(RunnerError::internal)?;

    write_lesson_files(workspace, &payload.files)
        .await
        .map_err(RunnerError::internal)?;

    if payload.mode == ExecutionMode::Check {
        if let LessonValidation::CargoTest { test_files } = &payload.validation {
            write_lesson_files(workspace, test_files)
                .await
                .map_err(RunnerError::internal)?;
        }
    }

    let mut command = build_command(payload, workspace);
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

        let checks = if payload.mode == ExecutionMode::Check {
            Some(evaluate_checks(payload))
        } else {
            None
        };

        let passed = checks.as_ref().map(|items| items.iter().all(|item| item.passed));

        return Ok(ExecutionResult {
            status: if passed.unwrap_or(true) {
                ExecutionStatus::Success
            } else {
                ExecutionStatus::Error
            },
            headline: result_headline(payload, passed),
            output: rendered_output,
            passed,
            checks,
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
        passed: if payload.mode == ExecutionMode::Check {
            Some(false)
        } else {
            None
        },
        checks: None,
    })
}

async fn write_lesson_files(root: &std::path::Path, files: &[LessonFile]) -> Result<(), std::io::Error> {
    for file in files {
        let normalized = normalize_relative_path(&file.path);
        let full_path = root.join(normalized);

        if let Some(parent) = full_path.parent() {
            fs::create_dir_all(parent).await?;
        }

        fs::write(full_path, &file.content).await?;
    }

    Ok(())
}

fn build_command(payload: &ExecutionRequest, workspace: &std::path::Path) -> Command {
    let mut command = Command::new("cargo");
    command.current_dir(workspace);

    match payload.mode {
        ExecutionMode::Run => {
            command.arg("run").arg("--quiet");
        }
        ExecutionMode::Check => match payload.validation {
            LessonValidation::Heuristic { .. } => {
                command.arg("run").arg("--quiet");
            }
            LessonValidation::CargoTest { .. } => {
                command.arg("test").arg("--quiet");
            }
        },
    }

    command
}

fn evaluate_checks(payload: &ExecutionRequest) -> Vec<CheckResult> {
    match &payload.validation {
        LessonValidation::Heuristic { checks } => {
            let joined_code = payload
                .files
                .iter()
                .map(|file| format!("// {}\n{}", file.path, file.content))
                .collect::<Vec<_>>()
                .join("\n\n");

            checks
                .iter()
                .map(|check| match check.check_type {
                    CheckType::Contains => contains_text(&joined_code, &check.value, &check.message),
                    CheckType::NotContains => {
                        not_contains_text(&joined_code, &check.value, &check.message)
                    }
                    CheckType::Regex => contains_regex(&joined_code, &check.value, &check.message),
                })
                .collect()
        }
        LessonValidation::CargoTest { .. } => vec![CheckResult {
            passed: true,
            message: "Hidden cargo tests passed.".to_string(),
        }],
    }
}

fn result_headline(payload: &ExecutionRequest, passed: Option<bool>) -> String {
    match payload.mode {
        ExecutionMode::Run => "Runner executed successfully".to_string(),
        ExecutionMode::Check => {
            if passed.unwrap_or(true) {
                "Lesson validation passed".to_string()
            } else {
                "Lesson validation failed".to_string()
            }
        }
    }
}

fn contains_text(code: &str, needle: &str, message: &str) -> CheckResult {
    CheckResult {
        passed: code.contains(needle),
        message: message.to_string(),
    }
}

fn not_contains_text(code: &str, needle: &str, message: &str) -> CheckResult {
    CheckResult {
        passed: !code.contains(needle),
        message: message.to_string(),
    }
}

fn contains_regex(code: &str, pattern: &str, message: &str) -> CheckResult {
    let passed = Regex::new(pattern)
        .map(|regex| regex.is_match(code))
        .unwrap_or(false);

    CheckResult {
        passed,
        message: message.to_string(),
    }
}

fn cargo_manifest(lesson_slug: &str, entry_file: &str) -> String {
    let package_name = sanitize_package_name(lesson_slug);
    let mut manifest = format!(
        "[package]\nname = \"{package_name}\"\nversion = \"0.1.0\"\nedition = \"2024\"\n\n[dependencies]\n"
    );

    if entry_file != "src/main.rs" {
        manifest.push_str(&format!("\n[[bin]]\nname = \"{package_name}-bin\"\npath = \"src/main.rs\"\n"));
    }

    manifest
}

fn sanitize_package_name(input: &str) -> String {
    input
        .chars()
        .map(|char| {
            if char.is_ascii_alphanumeric() {
                char.to_ascii_lowercase()
            } else {
                '-'
            }
        })
        .collect::<String>()
        .trim_matches('-')
        .to_string()
}

fn normalize_relative_path(path: &str) -> PathBuf {
    let mut clean = PathBuf::new();

    for component in PathBuf::from(path).components() {
        use std::path::Component;

        match component {
            Component::Normal(part) => clean.push(part),
            _ => continue,
        }
    }

    clean
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
            passed: Some(false),
            checks: None,
        });

        (self.status, body).into_response()
    }
}
