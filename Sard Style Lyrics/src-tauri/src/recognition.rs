use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use std::time::{Duration, Instant};
static LAST: Mutex<Option<Instant>> = Mutex::new(None);
#[derive(Deserialize, Serialize)]
pub struct RecognizedTrack {
    id: String,
    title: String,
    artist: String,
    album: Option<String>,
    duration: f64,
}
#[derive(Deserialize, Serialize)]
pub struct RecognitionResult {
    track: RecognizedTrack,
    position: Option<f64>,
    confidence: f64,
}
pub fn configured() -> bool {
    std::env::var("KINETIC_RECOGNITION_URL")
        .is_ok_and(|s| s.starts_with("https://") || s.starts_with("http://127.0.0.1:"))
}
/// Opt-in JSON gateway adapter. Vendor secrets stay in the native process environment.
pub async fn recognize(samples: Vec<f32>) -> Result<Option<RecognitionResult>, String> {
    if !configured() {
        return Err("No audio-recognition gateway configured.".into());
    }
    {
        let mut last = LAST.lock().map_err(|e| e.to_string())?;
        if last.is_some_and(|t| t.elapsed() < Duration::from_secs(25)) {
            return Err("Recognition cooling down.".into());
        }
        *last = Some(Instant::now());
    }
    let endpoint = std::env::var("KINETIC_RECOGNITION_URL").map_err(|e| e.to_string())?;
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(20))
        .redirect(reqwest::redirect::Policy::none())
        .build()
        .map_err(|e| e.to_string())?;
    let mut request = client
        .post(endpoint)
        .json(&serde_json::json!({"sampleRate":16000,"channels":1,"samples":samples}));
    if let Ok(token) = std::env::var("KINETIC_RECOGNITION_TOKEN") {
        request = request.bearer_auth(token);
    }
    let response = request.send().await.map_err(|e| e.to_string())?;
    if response.status() == 204 || response.status() == 404 {
        return Ok(None);
    }
    if !response.status().is_success() {
        return Err(format!(
            "Recognition gateway returned {}",
            response.status()
        ));
    }
    let value: RecognitionResult = response.json().await.map_err(|e| e.to_string())?;
    if value.track.title.is_empty()
        || value.track.artist.is_empty()
        || !value.confidence.is_finite()
        || !(0.0..=1.0).contains(&value.confidence)
        || !value.track.duration.is_finite()
        || value.track.duration < 0.
        || value.position.is_some_and(|p| !p.is_finite() || p < 0.)
    {
        return Err("Recognition gateway returned invalid metadata.".into());
    }
    Ok(Some(value))
}
