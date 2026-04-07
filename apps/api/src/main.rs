use axum::{
    Json, Router,
    extract::{
        Path, Query, State,
        ws::{Message, WebSocket, WebSocketUpgrade},
    },
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
};
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use std::{
    collections::HashMap,
    net::SocketAddr,
    path::{Path as StdPath, PathBuf},
    sync::{
        Arc,
        atomic::{AtomicU64, Ordering},
    },
};
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
    lsp_workspaces_root: PathBuf,
    progress_lock: Arc<Mutex<()>>,
    lsp_session_counter: Arc<AtomicU64>,
    lsp_sessions: Arc<Mutex<HashMap<String, LspSession>>>,
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

#[derive(Clone)]
struct LspSession {
    root_path: PathBuf,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct LspHealthResponse {
    status: &'static str,
    command: String,
    available: bool,
    version: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct LspSessionCreateRequest {
    lesson_slug: String,
    entry_file: String,
    files: Vec<LspLessonFile>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
struct LspLessonFile {
    path: String,
    content: String,
    editable: Option<bool>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct LspSessionCreateResponse {
    session_id: String,
    root_path: String,
    file_paths: HashMap<String, String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct LspSessionQuery {
    session_id: String,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let port = std::env::var("API_PORT")
        .ok()
        .and_then(|value| value.parse::<u16>().ok())
        .unwrap_or(DEFAULT_PORT);
    let workspace_root = std::env::current_dir()?.join("../..").canonicalize()?;

    let state = AppState {
        lessons_path: workspace_root.join("packages/lesson-content/src/lessons.json"),
        progress_path: PathBuf::from("data/progress.json"),
        lsp_workspaces_root: workspace_root.join("apps/api/data/lsp-workspaces"),
        progress_lock: Arc::new(Mutex::new(())),
        lsp_session_counter: Arc::new(AtomicU64::new(1)),
        lsp_sessions: Arc::new(Mutex::new(HashMap::new())),
        rust_analyzer_bin: std::env::var("RUST_ANALYZER_BIN")
            .unwrap_or_else(|_| DEFAULT_RUST_ANALYZER_BIN.to_string()),
    };

    ensure_progress_store_exists(&state.progress_path).await?;
    fs::create_dir_all(&state.lsp_workspaces_root).await?;

    let app = Router::new()
        .route("/health", get(health))
        .route("/lessons", get(list_lessons))
        .route("/lessons/{slug}", get(get_lesson))
        .route("/progress/{learner_id}", get(get_progress).put(update_progress))
        .route("/lsp/health", get(lsp_health))
        .route("/lsp/sessions", post(create_lsp_session))
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
    Query(query): Query<LspSessionQuery>,
) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handle_lsp_socket(socket, state, query.session_id))
}

async fn create_lsp_session(
    State(state): State<AppState>,
    Json(payload): Json<LspSessionCreateRequest>,
) -> Result<Json<LspSessionCreateResponse>, ApiError> {
    let session_id = next_lsp_session_id(&state);
    let session_root = state.lsp_workspaces_root.join(&session_id);
    let file_paths = materialize_lsp_workspace(&session_root, &payload).await?;
    let canonical_root = session_root.canonicalize().map_err(ApiError::internal)?;

    state.lsp_sessions.lock().await.insert(
        session_id.clone(),
        LspSession {
            root_path: canonical_root.clone(),
        },
    );

    Ok(Json(LspSessionCreateResponse {
        session_id,
        root_path: canonical_root.to_string_lossy().to_string(),
        file_paths,
    }))
}

async fn handle_lsp_socket(mut socket: WebSocket, state: AppState, session_id: String) {
    let session = {
        let sessions = state.lsp_sessions.lock().await;
        sessions.get(&session_id).cloned()
    };

    let Some(session) = session else {
        let _ = socket
            .send(Message::Text(
                json!({
                    "jsonrpc": "2.0",
                    "method": "window/logMessage",
                    "params": {
                        "type": 1,
                        "message": format!("Unknown LSP session `{session_id}`"),
                    }
                })
                .to_string()
                .into(),
            ))
            .await;
        let _ = socket.send(Message::Close(None)).await;
        return;
    };

    let mut child = match Command::new(&state.rust_analyzer_bin)
        .current_dir(&session.root_path)
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
                        if sync_lsp_workspace_change(&session.root_path, payload.as_str()).await.is_err() {
                            break;
                        }
                        if write_lsp_message(&mut stdin, payload.as_str()).await.is_err() {
                            break;
                        }
                    }
                    Message::Binary(payload) => {
                        if let Ok(text) = String::from_utf8(payload.to_vec()) {
                            if sync_lsp_workspace_change(&session.root_path, &text).await.is_err() {
                                break;
                            }
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
    cleanup_lsp_session(&state, &session_id, &session.root_path).await;
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

fn next_lsp_session_id(state: &AppState) -> String {
    let sequence = state.lsp_session_counter.fetch_add(1, Ordering::Relaxed);
    let seconds = chrono_like_now();
    format!("lsp-{seconds}-{sequence}")
}

async fn materialize_lsp_workspace(
    session_root: &StdPath,
    payload: &LspSessionCreateRequest,
) -> Result<HashMap<String, String>, ApiError> {
    if fs::try_exists(session_root)
        .await
        .map_err(ApiError::internal)?
    {
        fs::remove_dir_all(session_root)
            .await
            .map_err(ApiError::internal)?;
    }

    fs::create_dir_all(session_root)
        .await
        .map_err(ApiError::internal)?;

    let mut file_paths = HashMap::new();
    let cargo_toml_path = session_root.join("Cargo.toml");
    fs::write(
        &cargo_toml_path,
        render_cargo_toml(&payload.lesson_slug, &payload.entry_file, &payload.files),
    )
    .await
    .map_err(ApiError::internal)?;
    file_paths.insert(
        "Cargo.toml".to_string(),
        cargo_toml_path
            .canonicalize()
            .map_err(ApiError::internal)?
            .to_string_lossy()
            .to_string(),
    );

    for file in &payload.files {
        let target_path = session_root.join(&file.path);
        if let Some(parent) = target_path.parent() {
            fs::create_dir_all(parent).await.map_err(ApiError::internal)?;
        }
        fs::write(&target_path, &file.content)
            .await
            .map_err(ApiError::internal)?;
        file_paths.insert(
            file.path.clone(),
            target_path
                .canonicalize()
                .map_err(ApiError::internal)?
                .to_string_lossy()
                .to_string(),
        );
    }

    Ok(file_paths)
}

fn render_cargo_toml(lesson_slug: &str, entry_file: &str, files: &[LspLessonFile]) -> String {
    let crate_name = lesson_slug.replace(|ch: char| !ch.is_ascii_alphanumeric(), "_");
    let has_bin = files.iter().any(|file| file.path == "src/main.rs");
    let has_lib = files.iter().any(|file| file.path == "src/lib.rs");
    let mut sections = vec![
        "[package]".to_string(),
        format!("name = \"{crate_name}\""),
        "version = \"0.1.0\"".to_string(),
        "edition = \"2024\"".to_string(),
        String::new(),
    ];

    if has_bin && !has_lib {
        sections.extend([
            "[[bin]]".to_string(),
            format!("name = \"{crate_name}\""),
            format!("path = \"{entry_file}\""),
            String::new(),
        ]);
    }

    if has_lib {
        sections.extend(["[lib]".to_string(), "path = \"src/lib.rs\"".to_string(), String::new()]);
    }

    sections.join("\n")
}

async fn sync_lsp_workspace_change(session_root: &StdPath, payload: &str) -> Result<(), std::io::Error> {
    let message = match serde_json::from_str::<Value>(payload) {
        Ok(message) => message,
        Err(_) => return Ok(()),
    };

    let Some(method) = message.get("method").and_then(Value::as_str) else {
        return Ok(());
    };

    let Some(params) = message.get("params") else {
        return Ok(());
    };

    match method {
        "textDocument/didOpen" => {
            let Some(document) = params.get("textDocument") else {
                return Ok(());
            };
            let Some(uri) = document.get("uri").and_then(Value::as_str) else {
                return Ok(());
            };
            let Some(text) = document.get("text").and_then(Value::as_str) else {
                return Ok(());
            };
            write_uri_contents(session_root, uri, text).await?;
        }
        "textDocument/didChange" => {
            let Some(uri) = params
                .get("textDocument")
                .and_then(|document| document.get("uri"))
                .and_then(Value::as_str)
            else {
                return Ok(());
            };
            let Some(text) = params
                .get("contentChanges")
                .and_then(Value::as_array)
                .and_then(|changes| changes.first())
                .and_then(|change| change.get("text"))
                .and_then(Value::as_str)
            else {
                return Ok(());
            };
            write_uri_contents(session_root, uri, text).await?;
        }
        _ => {}
    }

    Ok(())
}

async fn write_uri_contents(session_root: &StdPath, uri: &str, text: &str) -> Result<(), std::io::Error> {
    let Some(path) = file_uri_to_path(uri) else {
        return Ok(());
    };

    if !path.starts_with(session_root) {
        return Ok(());
    }

    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).await?;
    }

    fs::write(path, text).await
}

fn file_uri_to_path(uri: &str) -> Option<PathBuf> {
    let raw_path = uri.strip_prefix("file://")?;
    Some(PathBuf::from(raw_path.replace("%20", " ")))
}

async fn cleanup_lsp_session(state: &AppState, session_id: &str, session_root: &StdPath) {
    state.lsp_sessions.lock().await.remove(session_id);
    let _ = fs::remove_dir_all(session_root).await;
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
