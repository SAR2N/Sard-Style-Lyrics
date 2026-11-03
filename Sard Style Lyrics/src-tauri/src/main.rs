#![cfg_attr(windows, windows_subsystem = "windows")]
mod audio;
mod lyrics;
mod media;
mod recognition;
use std::sync::Mutex;
#[tauri::command]
fn audio_devices() -> Result<Vec<String>, String> {
    audio::devices()
}
#[tauri::command]
async fn start_capture(
    state: tauri::State<'_, Mutex<audio::AudioService>>,
    device: String,
) -> Result<(), String> {
    state.lock().map_err(|e| e.to_string())?.start(device)
}
#[tauri::command]
async fn stop_capture(state: tauri::State<'_, Mutex<audio::AudioService>>) -> Result<(), String> {
    state.lock().map_err(|e| e.to_string())?.stop();
    Ok(())
}
#[tauri::command]
fn audio_snapshot(
    state: tauri::State<'_, Mutex<audio::AudioService>>,
) -> Result<audio::AudioSnapshot, String> {
    Ok(state.lock().map_err(|e| e.to_string())?.snapshot())
}
#[tauri::command]
async fn media_snapshot() -> Result<Option<media::MediaSnapshot>, String> {
    tauri::async_runtime::spawn_blocking(media::snapshot)
        .await
        .map_err(|e| e.to_string())?
}
#[tauri::command]
async fn lyrics_request(path: String) -> Result<serde_json::Value, String> {
    lyrics::request(path).await
}
#[tauri::command]
fn recognition_configured() -> bool {
    recognition::configured()
}
#[tauri::command]
async fn recognize_audio(
    state: tauri::State<'_, Mutex<audio::AudioService>>,
) -> Result<Option<recognition::RecognitionResult>, String> {
    let samples = state
        .lock()
        .map_err(|e| e.to_string())?
        .recognition_samples()?;
    recognition::recognize(samples).await
}
fn main() {
    tauri::Builder::default()
        .manage(Mutex::new(audio::AudioService::default()))
        .invoke_handler(tauri::generate_handler![
            audio_devices,
            start_capture,
            stop_capture,
            audio_snapshot,
            media_snapshot,
            lyrics_request,
            recognition_configured,
            recognize_audio
        ])
        .run(tauri::generate_context!())
        .expect("Failed to launch KINETIC LIVE");
}
