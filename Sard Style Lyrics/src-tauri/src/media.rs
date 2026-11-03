use serde::Serialize;
#[derive(Serialize)]
pub struct Track {
    id: String,
    title: String,
    artist: String,
    album: String,
    duration: f64,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaSnapshot {
    track: Track,
    position: f64,
    playing: bool,
    timeline_valid: bool,
    source: String,
    playback_rate: f64,
}
#[cfg(windows)]
pub fn snapshot() -> Result<Option<MediaSnapshot>, String> {
    use windows::{
        Media::Control::{
            GlobalSystemMediaTransportControlsSessionManager as Manager,
            GlobalSystemMediaTransportControlsSessionPlaybackStatus as Status,
        },
        Win32::System::WinRT::{RoInitialize, RoUninitialize, RO_INIT_MULTITHREADED},
    };
    let initialized = unsafe { RoInitialize(RO_INIT_MULTITHREADED) }.is_ok();
    struct Apartment(bool);
    impl Drop for Apartment {
        fn drop(&mut self) {
            if self.0 {
                unsafe { RoUninitialize() }
            }
        }
    }
    let _apartment = Apartment(initialized);
    let read = || -> windows::core::Result<Option<MediaSnapshot>> {
        let manager = Manager::RequestAsync()?.get()?;
        let session = match manager.GetCurrentSession() {
            Ok(s) => s,
            Err(_) => return Ok(None),
        };
        let p = session.TryGetMediaPropertiesAsync()?.get()?;
        let title = p.Title()?.to_string();
        if title.trim().is_empty() {
            return Ok(None);
        }
        let artist = p.Artist()?.to_string();
        let album = p.AlbumTitle()?.to_string();
        let source = session.SourceAppUserModelId()?.to_string();
        let timeline = session.GetTimelineProperties()?;
        let start = timeline.StartTime()?.Duration as f64 / 10_000_000.;
        let end = timeline.EndTime()?.Duration as f64 / 10_000_000.;
        let duration = (end - start).max(0.);
        let status = session.GetPlaybackInfo()?;
        let playing = status.PlaybackStatus()? == Status::Playing;
        let mut position = timeline.Position()?.Duration as f64 / 10_000_000. - start;
        let updated = timeline.LastUpdatedTime()?.UniversalTime;
        // WinRT DateTime is 100 ns since 1601. Extrapolate only while playing.
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs_f64()
            + 11_644_473_600.;
        let elapsed = (now - updated as f64 / 10_000_000.).max(0.);
        let rate = status
            .PlaybackRate()
            .ok()
            .and_then(|r| r.Value().ok())
            .filter(|r| r.is_finite() && *r >= 0. && *r <= 4.)
            .unwrap_or(1.);
        if playing && updated > 0 {
            position += elapsed * rate;
        }
        let valid = duration > 0. && updated > 0 && position.is_finite();
        Ok(Some(MediaSnapshot {
            track: Track {
                id: format!("{source}|{title}|{artist}|{album}|{duration}"),
                title,
                artist,
                album,
                duration,
            },
            position: position.clamp(0., duration.max(0.)),
            playing,
            timeline_valid: valid,
            source,
            playback_rate: rate,
        }))
    };
    read().map_err(|e| e.to_string())
}
#[cfg(not(windows))]
pub fn snapshot() -> Result<Option<MediaSnapshot>, String> {
    Err("Windows media sessions are unavailable on this platform.".into())
}
