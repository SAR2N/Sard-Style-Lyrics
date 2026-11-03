import { invoke, isTauri } from "@tauri-apps/api/core";
import type { AudioSnapshot, MediaSnapshot } from "../types";
import type { RecognitionResult } from "./recognition";
export const native = isTauri();
export const audioDevices = () =>
  native ? invoke<string[]>("audio_devices") : Promise.resolve([]);
export const startCapture = (device: string) =>
  native
    ? invoke<void>("start_capture", { device })
    : Promise.reject(
        new Error(
          "System capture requires the Windows desktop application.",
        ),
      );
export const stopCapture = () =>
  native ? invoke<void>("stop_capture") : Promise.resolve();
export const audioSnapshot = () => invoke<AudioSnapshot>("audio_snapshot");
export const mediaSnapshot = () =>
  invoke<MediaSnapshot | null>("media_snapshot");
export const nativeLyrics = (path: string) =>
  invoke<unknown>("lyrics_request", { path });
export const recognitionConfigured = () =>
  native ? invoke<boolean>("recognition_configured") : Promise.resolve(false);
export const recognizeAudio = () =>
  invoke<RecognitionResult | null>("recognize_audio");
