use axum::{
    Json, Router,
    extract::{
        Path, State,
        ws::{Message, WebSocket, WebSocketUpgrade},
    },
    http::StatusCode,
    response::IntoResponse,
    routing::get,
};
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use std::{collections::HashMap, net::SocketAddr, path::PathBuf, sync::Arc};
use tokio::{
    fs,
    io::{AsyncBufReadExt, AsyncReadExt, AsyncWrite, AsyncWriteExt, BufReader},
    net::TcpListener,
    process::{ChildStderr, ChildStdout, Command},
    sync::Mutex,
};
use tower_http::cors::CorsLayer;

const DEFAULT_PORT: u16 = 9092;
const DEFAULT_RUST_ANALYZER_BIN: &str = "rust-analyzer";

#[derive(Clone)]
struct AppState {
    lessons_path: PathBuf,
    progress_path: PathBuf,
    workspace_root: PathBuf,
    progress_lock: Arc<Mutex<()>>,
    rust_analyzer_bin: String,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct LessonProgressEntry {
    status: String,
    updated_at: String,
}

type LessonProgressMap = HashMap<String, LessonProgressEntry>;
type LearnerProgressStore = HashMap<String, LessonProgressMap>;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct LessonProgressUpdateRequest {
    lesson_slug: String,
    status: String,
}

#[derive(Debug, Serialize)]
struct HealthResponse {
    status: &'static str,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct LspHealthResponse {
    status: &'static str,
    command: String,
    available: bool,
    version: Option<String>,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let port = std::env::var("API_PORT")
        .ok()
        .and_then(|value| value.parse::<u16>().ok())
        .unwrap_or(DEFAULT_PORT);
    let workspace_root = std::env::current_dir()?.join("../..");

    let state = AppState {
        lessons_path: workspace_root.join("packages/lesson-content/src/lessons.json"),
        progress_path: PathBuf::from("data/progress.json"),
        workspace_root,
        progress_lock: Arc::new(Mutex::new(())),
        rust_analyzer_bin: std::env::var("RUST_ANALYZER_BIN")
            .unwrap_or_else(|_| DEFAULT_RUST_ANALYZER_BIN.to_string()),
    };

    ensure_progress_store_exists(&state.progress_path).await?;

    let app = Router::new()
        .route("/health", get(health))
        .route("/lessons", get(list_lessons))
        .route("/lessons/{slug}", get(get_lesson))
        .route("/progress/{learner_id}", get(get_progress).put(update_progress))
        .route("/lsp/health", get(lsp_health))
        .route("/lsp/ws", get(lsp_websocket))
        .layer(CorsLayer::permissive())
        .with_state(state);

    let addr = SocketAddr::from(([127, 0, 0, 1], port));
    let listener = TcpListener::bind(addr).await?;

    println!("rust-learning api listening on http://{addr}");

    axum::serve(listener, app).await?;

    Ok(())
}

async fn health() -> Json<HealthResponse> {
    Json(HealthResponse { status: "ok" })
}

async fn lsp_health(State(state): State<AppState>) -> Json<LspHealthResponse> {
    match Command::new(&state.rust_analyzer_bin)
        .arg("--version")
        .output()
        .await
    {
        Ok(output) if output.status.success() => Json(LspHealthResponse {
            status: "ok",
            command: state.rust_analyzer_bin,
            available: true,
            version: Some(String::from_utf8_lossy(&output.stdout).trim().to_string()),
        }),
        Ok(output) => Json(LspHealthResponse {
            status: "degraded",
            command: state.rust_analyzer_bin,
            available: false,
            version: Some(String::from_utf8_lossy(&output.stderr).trim().to_string()),
        }),
        Err(_) => Json(LspHealthResponse {
            status: "unavailable",
            command: state.rust_analyzer_bin,
            available: false,
            version: None,
        }),
    }
}

async fn lsp_websocket(
    ws: WebSocketUpgrade,
    State(state): State<AppState>,
) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handle_lsp_socket(socket, state))
}

async fn handle_lsp_socket(mut socket: WebSocket, state: AppState) {
    let mut child = match Command::new(&state.rust_analyzer_bin)
        .current_dir(&state.workspace_root)
        .stdin(std::process::Stdio::piped())
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
    {
        Ok(child) => child,
        Err(error) => {
            let _ = socket
                .send(Message::Text(
                    json!({
                        "jsonrpc": "2.0",
                        "method": "window/logMessage",
                        "params": {
                            "type": 1,
                            "message": format!("Failed to start rust-analyzer: {error}"),
                        }
                    })
                    .to_string()
                    .into(),
                ))
                .await;
            let _ = socket.send(Message::Close(None)).await;
            return;
        }
    };

    let Some(mut stdin) = child.stdin.take() else {
        let _ = socket.send(Message::Close(None)).await;
        return;
    };
    let Some(stdout) = child.stdout.take() else {
        let _ = socket.send(Message::Close(None)).await;
        return;
    };

    if let Some(stderr) = child.stderr.take() {
        tokio::spawn(log_lsp_stderr(stderr));
    }

    let mut reader = BufReader::new(stdout);

    loop {
        tokio::select! {
            ws_message = socket.recv() => {
                let Some(Ok(message)) = ws_message else {
                    break;
                };

                match message {
                    Message::Text(payload) => {
                        if write_lsp_message(&mut stdin, payload.as_str()).await.is_err() {
                            break;
                        }
                    }
                    Message::Binary(payload) => {
                        if let Ok(text) = String::from_utf8(payload.to_vec()) {
                            if write_lsp_message(&mut stdin, &text).await.is_err() {
                                break;
                            }
                        }
                    }
                    Message::Close(_) => break,
                    Message::Ping(payload) => {
                        if socket.send(Message::Pong(payload)).await.is_err() {
                            break;
                        }
                    }
                    Message::Pong(_) => {}
                }
            }
            lsp_message = read_lsp_message(&mut reader) => {
                match lsp_message {
                    Ok(Some(payload)) => {
                        if socket.send(Message::Text(payload.into())).await.is_err() {
                            break;
                        }
                    }
                    Ok(None) => break,
                    Err(error) => {
                        let message = json!({
                            "jsonrpc": "2.0",
                            "method": "window/logMessage",
                            "params": {
                                "type": 1,
                                "message": format!("rust-analyzer stream error: {error}"),
                            }
                        }).to_string();

                        let _ = socket.send(Message::Text(message.into())).await;
                        break;
                    }
                }
            }
        }
    }

    let _ = child.start_kill();
    let _ = child.wait().await;
}

async fn log_lsp_stderr(stderr: ChildStderr) {
    let mut lines = BufReader::new(stderr).lines();

    while let Ok(Some(line)) = lines.next_line().await {
        eprintln!("rust-analyzer stderr: {line}");
    }
}

async fn read_lsp_message(reader: &mut BufReader<ChildStdout>) -> Result<Option<String>, std::io::Error> {
    let mut content_length = None;
    let mut line = String::new();

    loop {
        line.clear();
        let bytes_read = reader.read_line(&mut line).await?;

        if bytes_read == 0 {
            return Ok(None);
        }

        if line == "\r\n" {
            break;
        }

        if let Some(value) = line.strip_prefix("Content-Length:") {
            content_length = value.trim().parse::<usize>().ok();
        }
    }

    let Some(length) = content_length else {
        return Ok(None);
    };

    let mut body = vec![0; length];
    reader.read_exact(&mut body).await?;

    Ok(Some(String::from_utf8_lossy(&body).to_string()))
}

async fn write_lsp_message<W>(writer: &mut W, payload: &str) -> Result<(), std::io::Error>
where
    W: AsyncWrite + Unpin,
{
    let header = format!("Content-Length: {}\r\n\r\n", payload.len());
    writer.write_all(header.as_bytes()).await?;
    writer.write_all(payload.as_bytes()).await?;
    writer.flush().await
}

async fn list_lessons(State(state): State<AppState>) -> Result<Json<Value>, ApiError> {
    let lessons = read_lessons(&state.lessons_path).await?;
    Ok(Json(lessons))
}

async fn get_lesson(
    State(state): State<AppState>,
    Path(slug): Path<String>,
) -> Result<Json<Value>, ApiError> {
    let lessons = read_lessons(&state.lessons_path).await?;
    let list = lessons
        .as_array()
        .ok_or_else(|| ApiError::internal("Lesson file did not contain an array"))?;

    let lesson = list
        .iter()
        .find(|item| item.get("slug").and_then(Value::as_str) == Some(slug.as_str()))
        .cloned()
        .ok_or_else(|| ApiError::not_found(format!("Lesson `{slug}` was not found")))?;

    Ok(Json(lesson))
}

async fn get_progress(
    State(state): State<AppState>,
    Path(learner_id): Path<String>,
) -> Result<Json<LessonProgressMap>, ApiError> {
    let store = read_progress_store(&state.progress_path).await?;
    Ok(Json(store.get(&learner_id).cloned().unwrap_or_default()))
}

async fn update_progress(
    State(state): State<AppState>,
    Path(learner_id): Path<String>,
    Json(payload): Json<LessonProgressUpdateRequest>,
) -> Result<Json<LessonProgressMap>, ApiError> {
    let _guard = state.progress_lock.lock().await;
    let mut store = read_progress_store(&state.progress_path).await?;
    let next_progress = {
        let learner_progress = store.entry(learner_id).or_default();

        learner_progress.insert(
            payload.lesson_slug,
            LessonProgressEntry {
                status: payload.status,
                updated_at: chrono_like_now(),
            },
        );

        learner_progress.clone()
    };

    write_progress_store(&state.progress_path, &store).await?;

    Ok(Json(next_progress))
}

async fn read_lessons(path: &PathBuf) -> Result<Value, ApiError> {
    let contents = fs::read_to_string(path).await.map_err(ApiError::internal)?;

    serde_json::from_str(&contents).map_err(ApiError::internal)
}

async fn ensure_progress_store_exists(path: &PathBuf) -> Result<(), std::io::Error> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).await?;
    }

    if fs::try_exists(path).await? {
        return Ok(());
    }

    fs::write(path, "{}").await
}

async fn read_progress_store(path: &PathBuf) -> Result<LearnerProgressStore, ApiError> {
    let contents = fs::read_to_string(path).await.map_err(ApiError::internal)?;

    serde_json::from_str(&contents).map_err(ApiError::internal)
}

async fn write_progress_store(
    path: &PathBuf,
    store: &LearnerProgressStore,
) -> Result<(), ApiError> {
    let body = serde_json::to_string_pretty(store).map_err(ApiError::internal)?;
    fs::write(path, body).await.map_err(ApiError::internal)
}

fn chrono_like_now() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};

    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs().to_string())
        .unwrap_or_else(|_| "0".to_string())
}

struct ApiError {
    status: StatusCode,
    message: String,
}

impl ApiError {
    fn internal(error: impl std::fmt::Display) -> Self {
        Self {
            status: StatusCode::INTERNAL_SERVER_ERROR,
            message: format!("API internal error: {error}"),
        }
    }

    fn not_found(message: String) -> Self {
        Self {
            status: StatusCode::NOT_FOUND,
            message,
        }
    }
}

impl IntoResponse for ApiError {
    fn into_response(self) -> axum::response::Response {
        (self.status, self.message).into_response()
    }
}
