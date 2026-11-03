use serde::Serialize;
use std::collections::VecDeque;
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc, Mutex,
};
use std::time::{Duration, Instant};

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AudioSnapshot {
    pub level: f32,
    pub spectrum: Vec<f32>,
    pub silent: bool,
    pub available: bool,
    pub device: String,
    pub timestamp_ms: u64,
    pub error: Option<String>,
}
struct Meter {
    snapshot: AudioSnapshot,
    last_packet: Instant,
    samples: VecDeque<f32>,
    spectrum_samples: VecDeque<f32>,
}
pub struct AudioService {
    meter: Arc<Mutex<Meter>>,
    stop: Option<Arc<AtomicBool>>,
    worker: Option<std::thread::JoinHandle<()>>,
    origin: Instant,
}
impl Default for AudioService {
    fn default() -> Self {
        Self {
            meter: Arc::new(Mutex::new(Meter {
                snapshot: AudioSnapshot {
                    level: 0.,
                    spectrum: vec![0.;32],
                    silent: true,
                    available: false,
                    device: String::new(),
                    timestamp_ms: 0,
                    error: None,
                },
                last_packet: Instant::now(),
                samples: VecDeque::with_capacity(192000),
                spectrum_samples: VecDeque::with_capacity(1024),
            })),
            stop: None,
            worker: None,
            origin: Instant::now(),
        }
    }
}
impl AudioService {
    pub fn stop(&mut self) {
        if let Some(s) = self.stop.take() {
            s.store(true, Ordering::Relaxed);
        }
        if let Some(w) = self.worker.take() {
            let _ = w.join();
        }
        if let Ok(mut m) = self.meter.lock() {
            m.snapshot.level = 0.;
            m.snapshot.silent = true;
            m.snapshot.available = false;
            m.samples.clear();
            m.spectrum_samples.clear();
            m.snapshot.spectrum.fill(0.);
        }
    }
    pub fn recognition_samples(&self) -> Result<Vec<f32>, String> {
        let m = self.meter.lock().map_err(|e| e.to_string())?;
        if !m.snapshot.available || m.snapshot.silent {
            return Err("Waiting for audible system audio.".into());
        }
        if m.samples.len() < 128000 {
            return Err("Collecting an eight-second recognition window…".into());
        }
        Ok(m.samples.iter().copied().collect())
    }
    pub fn snapshot(&self) -> AudioSnapshot {
        let mut m = self.meter.lock().unwrap();
        if m.last_packet.elapsed() > Duration::from_millis(500) {
            m.snapshot.level = 0.;
            m.snapshot.silent = true;
        }
        if m.snapshot.available && !m.snapshot.silent {
            m.snapshot.spectrum=frequency_bands(&m.spectrum_samples.iter().copied().collect::<Vec<_>>());
        } else {m.snapshot.spectrum.fill(0.);}
        m.snapshot.clone()
    }
    #[cfg(windows)]
    pub fn start(&mut self, device: String) -> Result<(), String> {
        self.stop();
        let stop = Arc::new(AtomicBool::new(false));
        self.stop = Some(stop.clone());
        let meter = self.meter.clone();
        let origin = self.origin;
        self.worker = Some(std::thread::spawn(move || {
            use cpal::traits::{DeviceTrait, HostTrait};
            while !stop.load(Ordering::Relaxed) {
                let host = cpal::default_host();
                let endpoint = if device.is_empty() {
                    host.default_output_device()
                } else {
                    host.output_devices()
                        .ok()
                        .and_then(|mut ds| ds.find(|d| d.name().ok().as_deref() == Some(&device)))
                };
                let endpoint = match endpoint {
                    Some(d) => d,
                    None => {
                        set_error(&meter, "Audio output device unavailable. Retrying…".into());
                        std::thread::sleep(Duration::from_millis(500));
                        continue;
                    }
                };
                let name = endpoint.name().unwrap_or_else(|_| "Windows output".into());
                let fault = Arc::new(AtomicBool::new(false));
                match build_stream(&endpoint, meter.clone(), fault.clone(), origin) {
                    Ok(stream) => {
                        if let Ok(mut m) = meter.lock() {
                            m.snapshot.available = true;
                            m.snapshot.device = name.clone();
                            m.snapshot.error = None;
                        }
                        // Stream stays on this worker; only a small RMS snapshot crosses to IPC.
                        while !stop.load(Ordering::Relaxed) && !fault.load(Ordering::Relaxed) {
                            std::thread::sleep(Duration::from_millis(200));
                            if device.is_empty()
                                && host
                                    .default_output_device()
                                    .and_then(|d| d.name().ok())
                                    .as_deref()
                                    != Some(&name)
                            {
                                break;
                            }
                        }
                        drop(stream);
                        if let Ok(mut m) = meter.lock() {
                            m.samples.clear();
                            m.snapshot.available = false;
                        }
                    }
                    Err(e) => set_error(&meter, e),
                }
                if !stop.load(Ordering::Relaxed) {
                    std::thread::sleep(Duration::from_millis(400));
                }
            }
        }));
        Ok(())
    }
    #[cfg(not(windows))]
    pub fn start(&mut self, _device: String) -> Result<(), String> {
        Err("WASAPI capture requires Windows.".into())
    }
}
impl Drop for AudioService {
    fn drop(&mut self) {
        self.stop();
    }
}
fn set_error(meter: &Arc<Mutex<Meter>>, error: String) {
    if let Ok(mut m) = meter.lock() {
        m.snapshot.available = false;
        m.snapshot.error = Some(error);
        m.snapshot.level = 0.;
        m.snapshot.silent = true;
        m.snapshot.spectrum.fill(0.);
        m.spectrum_samples.clear();
    }
}
#[cfg(windows)]
fn build_stream(
    device: &cpal::Device,
    meter: Arc<Mutex<Meter>>,
    fault: Arc<AtomicBool>,
    origin: Instant,
) -> Result<cpal::Stream, String> {
    use cpal::{
        traits::{DeviceTrait, StreamTrait},
        SampleFormat,
    };
    let config = device.default_output_config().map_err(|e| e.to_string())?;
    // CPAL's Windows backend sets AUDCLNT_STREAMFLAGS_LOOPBACK when an input stream
    // is built on a render endpoint. Never select an input/microphone device here.
    macro_rules! build {($t:ty,$convert:expr)=>{{
  let err_meter=meter.clone();let fault=fault.clone();let channels=config.channels() as usize;let rate=config.sample_rate().0 as f64;let mut phase=0.;let mut accum=0.;let mut count=0u32;let recognition_enabled=std::env::var_os("KINETIC_RECOGNITION_URL").is_some();
  device.build_input_stream(&config.config(),move|data:&[$t],_:&cpal::InputCallbackInfo|{
   let sum=data.iter().map(|v|{let x:f32=($convert)(*v);x*x}).sum::<f32>();
   let rms=(sum/data.len().max(1) as f32).sqrt().min(1.);
   if let Ok(mut m)=meter.try_lock(){m.snapshot.level=rms;m.snapshot.silent=rms<0.001;m.snapshot.timestamp_ms=origin.elapsed().as_millis() as u64;m.last_packet=Instant::now();
    // A 64ms mono ring powers the spectrum; the longer recognition ring remains opt-in.
    for frame in data.chunks(channels){accum+=frame.iter().map(|v|($convert)(*v)).sum::<f32>()/channels as f32;count+=1;phase+=16000.;if phase>=rate{phase-=rate;let mono=accum/count as f32;if m.spectrum_samples.len()==1024{m.spectrum_samples.pop_front();}m.spectrum_samples.push_back(mono);if recognition_enabled{if m.samples.len()==192000{m.samples.pop_front();}m.samples.push_back(mono);}accum=0.;count=0;}}
   }
  },move|e|{set_error(&err_meter,e.to_string());fault.store(true,Ordering::Relaxed);},None)
 }};}
    let stream = match config.sample_format() {
        SampleFormat::F32 => build!(f32, |v: f32| v),
        SampleFormat::I16 => build!(i16, |v: i16| v as f32 / 32768.),
        SampleFormat::I32 => build!(i32, |v: i32| v as f32 / 2147483648.),
        SampleFormat::U16 => build!(u16, |v: u16| (v as f32 - 32768.) / 32768.),
        f => return Err(format!("Unsupported output sample format: {f:?}")),
    }
    .map_err(|e| e.to_string())?;
    stream.play().map_err(|e| e.to_string())?;
    Ok(stream)
}
pub fn devices() -> Result<Vec<String>, String> {
    #[cfg(windows)]
    {
        use cpal::traits::{DeviceTrait, HostTrait};
        Ok(cpal::default_host()
            .output_devices()
            .map_err(|e| e.to_string())?
            .filter_map(|d| d.name().ok())
            .collect())
    }
    #[cfg(not(windows))]
    {
        Ok(Vec::new())
    }
}

#[cfg(all(test, windows))]
mod tests {
    use super::*;
    use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
    #[test]
    #[ignore = "hardware test: briefly plays a quiet generated tone through the default output"]
    fn wasapi_loopback_captures_generated_output() {
        let device = cpal::default_host()
            .default_output_device()
            .expect("Default Windows output device");
        let config = device.default_output_config().unwrap();
        assert_eq!(
            config.sample_format(),
            cpal::SampleFormat::F32,
            "Hardware fixture expects a float render endpoint"
        );
        let channels = config.channels() as usize;
        let rate = config.sample_rate().0 as f32;
        let mut phase = 0f32;
        let mut capture = AudioService::default();
        capture.start(String::new()).unwrap();
        std::thread::sleep(Duration::from_millis(600));
        let stream = device
            .build_output_stream(
                &config.config(),
                move |data: &mut [f32], _: &cpal::OutputCallbackInfo| {
                    for frame in data.chunks_mut(channels) {
                        phase = (phase + 440. / rate) % 1.;
                        let value = (phase * std::f32::consts::TAU).sin() * 0.015;
                        for sample in frame {
                            *sample = value;
                        }
                    }
                },
                |error| eprintln!("Test output error: {error}"),
                None,
            )
            .unwrap();
        stream.play().unwrap();
        let mut peak = 0f32;
        for _ in 0..15 {
            std::thread::sleep(Duration::from_millis(100));
            peak = peak.max(capture.snapshot().level);
        }
        drop(stream);
        let snapshot = capture.snapshot();
        capture.stop();
        assert!(
            snapshot.available,
            "Loopback endpoint unavailable: {:?}",
            snapshot.error
        );
        assert!(
            peak > 0.001,
            "Expected nonzero captured output, got RMS {peak}"
        );
    }
}

/** Hann-windowed Goertzel analysis of logarithmic frequency bins at 16kHz. */
fn frequency_bands(samples:&[f32])->Vec<f32>{
 let n=samples.len();if n<256{return vec![0.;32];}
 let window:Vec<f32>=samples.iter().enumerate().map(|(i,x)|x*(0.5-0.5*(std::f32::consts::TAU*i as f32/(n-1) as f32).cos())).collect();
 (0..32).map(|band|{
  let frequency=60_f32*(7600_f32/60.).powf(band as f32/31.);
  let bin=(frequency*n as f32/16000.).round().max(1.);
  let coefficient=2.*(std::f32::consts::TAU*bin/n as f32).cos();
  let(mut a,mut b)=(0_f32,0_f32);
  for x in &window{let next=x+coefficient*a-b;b=a;a=next;}
  let amplitude=(a*a+b*b-coefficient*a*b).max(0.).sqrt()*2./n as f32;
  ((1.+amplitude*48.).ln()/7_f32.ln()).clamp(0.,1.)
 }).collect()
}
#[cfg(test)]
mod spectrum_tests{
 use super::*;
 #[test]fn silence_has_no_frequency_energy(){assert!(frequency_bands(&vec![0.;1024]).iter().all(|x|*x==0.));}
 #[test]fn tone_peaks_near_its_actual_frequency(){let samples:Vec<f32>=(0..1024).map(|i|(std::f32::consts::TAU*1000.*i as f32/16000.).sin()*0.2).collect();let bands=frequency_bands(&samples);let peak=bands.iter().enumerate().max_by(|a,b|a.1.partial_cmp(b.1).unwrap()).unwrap().0;let frequency=60_f32*(7600_f32/60.).powf(peak as f32/31.);assert!((frequency-1000.).abs()<180.);assert!(bands[peak]>0.2);}
}
