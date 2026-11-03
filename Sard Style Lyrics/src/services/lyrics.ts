import type { LyricsRecord, Track } from "../types";
import { Cache } from "./storage";
import { native, nativeLyrics } from "./native";
import { errorMessage, retryDelay, waitForRetry } from "./errors";
import {
  normalizeMetadata as normalize,
  cleanMetadata as clean,
  lyricIdentities,
} from "../lyrics/metadata";
export interface LyricsProvider {
  search(query: string, signal: AbortSignal): Promise<LyricsRecord[]>;
  get(
    track: Track,
    signal: AbortSignal,
    onRetry?: (message: string) => void,
  ): Promise<LyricsRecord | null>;
}
export const lyricsCache = new Cache<LyricsRecord>("kinetic.lyrics.");
let blockedUntil = 0;
let queue = Promise.resolve();
async function request(
  path: string,
  signal: AbortSignal,
  onRetry?: (message: string) => void,
): Promise<unknown> {
  const prior = queue;
  let release!: () => void;
  queue = new Promise((r) => (release = r));
  await prior;
  try {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        signal.throwIfAborted();
        if (Date.now() < blockedUntil)
          throw new Error(
            `LRCLIB busy. Retry after ${Math.ceil((blockedUntil - Date.now()) / 1000)} seconds.`,
          );
        if (native) {
          const value = await nativeLyrics(path);
          signal.throwIfAborted();
          return value;
        }
        const res = await fetch(`https://lrclib.net/api/${path}`, {
          signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]),
          headers: {
            "Lrclib-Client": `KINETIC LIVE v${__APP_VERSION__} (${import.meta.env.VITE_LRCLIB_CONTACT || "http://localhost:1420"})`,
          },
        });
        if (res.status === 429 || res.status === 503) {
          blockedUntil =
            Date.now() +
            Math.max(1, Number(res.headers.get("Retry-After")) || 60) * 1000 +
            Math.random() * 500;
          throw new Error(
            `LRCLIB busy or rate limited. Retry after ${Math.ceil((blockedUntil - Date.now()) / 1000)} seconds.`,
          );
        }
        if (res.status === 404) return null;
        if (!res.ok) throw new Error(`Lyrics service returned ${res.status}`);
        return await res.json();
      } catch (error) {
        if (signal.aborted) throw error;
        const delay = retryDelay(error);
        if (attempt === 2 || delay === null || delay > 90600)
          throw new Error(errorMessage(error));
        onRetry?.(
          `Lyrics service temporarily unavailable. Retrying in ${Math.ceil(delay / 1000)} seconds (${attempt + 1}/2)…`,
        );
        await waitForRetry(delay, signal);
      }
    }
    throw new Error("Lyrics service unavailable after retries. Try again.");
  } finally {
    setTimeout(release, 350);
  }
}
const cacheKey = (track: Track) =>
  JSON.stringify([
    track.title,
    track.artist,
    track.album,
    Math.round(track.duration),
  ]);
export function cacheLyrics(track: Track, record: LyricsRecord) {
  lyricsCache.set(cacheKey(track), record);
}
export const recordingKey = (r: LyricsRecord) => JSON.stringify([r.syncedLyrics, r.lyricsfile]);
export class LrclibProvider implements LyricsProvider {
  async alternative(track: Track, excluded: Set<string>, signal: AbortSignal) {
    for (const identity of lyricIdentities(track.title, track.artist)) {
      const values = await request(`search?${new URLSearchParams({track_name:identity.title,artist_name:identity.artist})}`,signal);
      if (!Array.isArray(values)) continue;
      const matches = (values as LyricsRecord[]).filter(r =>
        normalize(clean(r.trackName)) === normalize(identity.title) &&
        normalize(clean(r.artistName)) === normalize(identity.artist) &&
        (track.duration <= 0 || Math.abs(r.duration-track.duration)<10) &&
        !!(r.syncedLyrics?.trim() || r.lyricsfile?.includes('start_ms:')) &&
        !excluded.has(recordingKey(r))
      ).sort((a,b)=>Math.abs(a.duration-track.duration)-Math.abs(b.duration-track.duration));
      if (matches.length) return matches[0];
    }
    return null;
  }
  async search(query: string, signal: AbortSignal) {
    return ((await request(
      `search?${new URLSearchParams({ q: query })}`,
      signal,
    )) ?? []) as LyricsRecord[];
  }
  async get(
    track: Track,
    signal: AbortSignal,
    onRetry?: (message: string) => void,
  ) {
    const key = cacheKey(track);
    const hit = lyricsCache.get(key);
    if (hit) return hit;
    const identities = lyricIdentities(track.title, track.artist);
    const primary = identities[0];
    const inferred =
      primary.title !== clean(track.title) ||
      primary.artist !== clean(track.artist);
    const params = new URLSearchParams({
      track_name: primary.title,
      artist_name: primary.artist,
    });
    if (track.album && !inferred) params.set("album_name", track.album);
    if (track.duration > 0)
      params.set("duration", String(Math.round(track.duration)));
    const value = (await request(
      `get?${params}`,
      signal,
      onRetry,
    )) as LyricsRecord | null;
    if (
      value &&
      normalize(clean(value.trackName)) === normalize(primary.title) &&
      normalize(clean(value.artistName)) === normalize(primary.artist) &&
      (!track.album ||
        inferred ||
        normalize(value.albumName) === normalize(track.album)) &&
      (track.duration <= 0 || Math.abs(value.duration - track.duration) < 3) &&
      !!(
        value.instrumental ||
        value.syncedLyrics?.trim() ||
        value.hasWordSync ||
        value.lyricsfile?.includes("start_ms:")
      )
    ) {
      lyricsCache.set(key, value);
      return value;
    }
    // Album editions and YouTube presentation suffixes differ from database metadata.
    // Keep artist, title and duration checks strict when relaxing the album field.
    for (const identity of identities) {
      const candidates = await request(
        `search?${new URLSearchParams({ track_name: identity.title, artist_name: identity.artist })}`,
        signal,
        onRetry,
      );
      if (!Array.isArray(candidates)) continue;
      const matches = (candidates as LyricsRecord[])
        .filter(
          (r) =>
            normalize(clean(r.trackName)) === normalize(identity.title) &&
            normalize(clean(r.artistName)) === normalize(identity.artist) &&
            (track.duration <= 0 ||
              Math.abs(r.duration - track.duration) < 3) &&
            !!(
              r.syncedLyrics?.trim() ||
              r.hasWordSync ||
              r.lyricsfile?.includes("start_ms:")
            ),
        )
        .sort(
          (a, b) =>
            Math.abs(a.duration - track.duration) -
            Math.abs(b.duration - track.duration),
        );
      // Without duration metadata, different recordings cannot be selected confidently.
      if (!matches.length || (track.duration <= 0 && matches.length > 1))
        continue;
      lyricsCache.set(key, matches[0]);
      return matches[0];
    }
    return null;
  }
}
