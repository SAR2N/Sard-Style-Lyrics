export type AppStatus =
  | "Waiting for audio"
  | "Listening"
  | "Recognizing song"
  | "Searching lyrics"
  | "Synchronizing"
  | "Visualizing"
  | "Lyrics unavailable"
  | "Recognition failed"
  | "Audio device unavailable";
export interface Track {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration: number;
}
export interface Word {
  text: string;
  start: number;
  end: number;
}
export interface LyricLine {
  text: string;
  start: number;
  end: number;
  words: Word[];
  precise: boolean;
}
export interface Lyrics {
  lines: LyricLine[];
  source: string;
  approximate: boolean;
}
export interface MediaSnapshot {
  playbackRate?: number;
  track: Track;
  position: number;
  playing: boolean;
  timelineValid: boolean;
  source: string;
}
export interface AudioSnapshot {
  spectrum?: number[];
  level: number;
  silent: boolean;
  available: boolean;
  device: string;
  timestampMs: number;
  error?: string;
}
export interface Settings {
  size: number;
  font: string;
  intensity: number;
  speed: number;
  mode: "word" | "line";
  background: string;
  color: string;
  offset: number;
  device: string;
  showSong: boolean;
}
export const defaults: Settings = {
  size: 88,
  font: "Arial",
  intensity: 0.65,
  speed: 1,
  mode: "word",
  background: "#000000",
  color: "#ffffff",
  offset: 0,
  device: "",
  showSong: true,
};
export interface LyricsRecord {
  lyricsfile?: string;
  hasWordSync?: boolean;
  id: number;
  trackName: string;
  artistName: string;
  albumName: string;
  duration: number;
  syncedLyrics: string | null;
  plainLyrics: string | null;
  instrumental: boolean;
}
