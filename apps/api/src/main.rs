use axum::{
    Json, Router,
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    routing::get,
};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::{collections::HashMap, net::SocketAddr, path::PathBuf, sync::Arc};
use tokio::{fs, net::TcpListener, sync::Mutex};
use tower_http::cors::CorsLayer;

const DEFAULT_PORT: u16 = 9092;

#[derive(Clone)]
struct AppState {
    lessons_path: PathBuf,
    progress_path: PathBuf,
    progress_lock: Arc<Mutex<()>>,
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

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let port = std::env::var("API_PORT")
        .ok()
        .and_then(|value| value.parse::<u16>().ok())
        .unwrap_or(DEFAULT_PORT);

    let state = AppState {
        lessons_path: PathBuf::from("../../packages/lesson-content/src/lessons.json"),
        progress_path: PathBuf::from("data/progress.json"),
        progress_lock: Arc::new(Mutex::new(())),
    };

    ensure_progress_store_exists(&state.progress_path).await?;

    let app = Router::new()
        .route("/health", get(health))
        .route("/lessons", get(list_lessons))
        .route("/lessons/{slug}", get(get_lesson))
        .route("/progress/{learner_id}", get(get_progress).put(update_progress))
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
    let contents = fs::read_to_string(path)
        .await
        .map_err(ApiError::internal)?;

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
    let contents = fs::read_to_string(path)
        .await
        .map_err(ApiError::internal)?;

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
