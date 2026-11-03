use std::sync::{Mutex, OnceLock};
use std::time::{Duration, Instant};
static NEXT: Mutex<Option<Instant>> = Mutex::new(None);
static CLIENT: OnceLock<reqwest::Client> = OnceLock::new();
pub async fn request(path: String) -> Result<serde_json::Value, String> {
    // Fixed HTTPS origin and constrained routes prevent arbitrary frontend HTTP access.
    if !(path.starts_with("get?") || path.starts_with("search?")) || path.len() > 4096 {
        return Err("Unsupported lyric query".into());
    }
    {
        let mut next = NEXT.lock().map_err(|e| e.to_string())?;
        let now = Instant::now();
        if let Some(at) = *next {
            if now < at {
                return Err(format!(
                    "LRCLIB cooling down. Retry after {} seconds.",
                    at.duration_since(now).as_secs() + 1
                ));
            }
        }
        *next = Some(now + Duration::from_millis(350));
    }
    let client = CLIENT.get_or_init(|| {
        let contact = std::env::var("KINETIC_LRCLIB_CONTACT")
            .unwrap_or_else(|_| "http://localhost:1420".into());
        reqwest::Client::builder()
            .timeout(Duration::from_secs(15))
            .user_agent(format!(
                "KINETIC LIVE v{} ({contact})",
                env!("CARGO_PKG_VERSION")
            ))
            .build()
            .expect("HTTP client")
    });
    let response = client
        .get(format!("https://lrclib.net/api/{path}"))
        .send()
        .await
        .map_err(|e| format!("Lyrics network unavailable: {e}"))?;
    if response.status() == 429 || response.status() == 503 {
        let seconds = response
            .headers()
            .get("retry-after")
            .and_then(|v| v.to_str().ok())
            .and_then(|v| v.parse::<u64>().ok())
            .unwrap_or(60)
            .max(1);
        let jitter = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .subsec_nanos() as u64
            % 500;
        if let Ok(mut next) = NEXT.lock() {
            *next =
                Some(Instant::now() + Duration::from_secs(seconds) + Duration::from_millis(jitter));
        }
        return Err(format!(
            "LRCLIB busy or rate limited. Retry after {seconds} seconds."
        ));
    }
    if response.status() == 404 {
        return Ok(serde_json::Value::Null);
    }
    if !response.status().is_success() {
        return Err(format!("Lyrics service returned {}", response.status()));
    }
    response.json().await.map_err(|e| e.to_string())
}
