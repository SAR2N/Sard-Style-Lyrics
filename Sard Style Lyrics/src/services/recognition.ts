import type { Track } from "../types";
/** Implementations must return a position only if the provider actually supplies one. */
export interface RecognitionResult {
  track: Track;
  position?: number;
  confidence: number;
}
export interface RecognitionProvider {
  name: string;
  recognize(
    samples: Float32Array,
    sampleRate: number,
    signal: AbortSignal,
  ): Promise<RecognitionResult | null>;
}
export class UnconfiguredRecognition implements RecognitionProvider {
  name = "Not configured";
  async recognize(): Promise<RecognitionResult | null> {
    throw new Error(
      "No audio-recognition provider configured. Waiting for Windows media-session metadata.",
    );
  }
}
