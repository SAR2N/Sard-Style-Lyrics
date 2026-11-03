import { parse } from "yaml";
import type { Lyrics, LyricsRecord, LyricLine } from "../types";
import { parseLrc } from "./parser";
type Row = { text: string; start_ms: number; end_ms?: number; words?: Row[] };
const time = (v: unknown): v is number =>
  typeof v === "number" && Number.isSafeInteger(v) && v >= 0;
function row(v: unknown): v is Row {
  if (!v || typeof v !== "object") return false;
  const r = v as Row;
  return (
    typeof r.text === "string" &&
    time(r.start_ms) &&
    (r.end_ms === undefined || (time(r.end_ms) && r.end_ms >= r.start_ms))
  );
}
/** Read Lyricsfile 1.0 word timing; unknown/invalid formats fall back to LRC. */
export function parseRecord(
  record: LyricsRecord,
  duration: number,
): Lyrics | null {
  if (record.lyricsfile && record.lyricsfile.length <= 2_000_000) {
    try {
      const doc = parse(record.lyricsfile, { maxAliasCount: 0 }) as {
        version?: unknown;
        lines?: unknown;
      };
      if (
        doc.version === "1.0" &&
        Array.isArray(doc.lines) &&
        doc.lines.length < 20000 &&
        doc.lines.every(row)
      ) {
        const rows = [...doc.lines].sort((a, b) => a.start_ms - b.start_ms);
        const lines: LyricLine[] = rows
          .map((r, i) => {
            const start = r.start_ms / 1000,
              end =
                r.end_ms !== undefined
                  ? r.end_ms / 1000
                  : (rows[i + 1]?.start_ms ??
                      Math.max(duration, start + 4) * 1000) / 1000;
            const precise =
              Array.isArray(r.words) &&
              r.words.length > 0 &&
              r.words.every(row) &&
              r.words.every(
                (w, j) =>
                  w.start_ms >= r.start_ms &&
                  w.start_ms / 1000 < end &&
                  (!j || w.start_ms >= r.words![j - 1].start_ms),
              ) &&
              r.words.map((w) => w.text).join("") === r.text;
            const tokens = r.text.split(/\s+/).filter(Boolean);
            const words = precise
              ? r.words!.map((w, j) => ({
                  text: w.text,
                  start: w.start_ms / 1000,
                  end:
                    w.end_ms !== undefined
                      ? Math.min(end, w.end_ms / 1000)
                      : (r.words![j + 1]?.start_ms ?? end * 1000) / 1000,
                }))
              : tokens.map((text, j) => ({
                  text: text + (j < tokens.length - 1 ? " " : ""),
                  start: start + ((end - start) * j) / tokens.length,
                  end: start + ((end - start) * (j + 1)) / tokens.length,
                }));
            return { text: r.text, start, end, words, precise };
          })
          .filter((l) => l.end > l.start);
        if (lines.length)
          return {
            lines,
            source: "LRCLIB / Lyricsfile",
            approximate: lines.some((l) => l.words.length > 0 && !l.precise),
          };
      }
    } catch {
      /* Untrusted YAML, aliases, or future format: use the interoperable LRC fallback. */
    }
  }
  return record.syncedLyrics
    ? parseLrc(record.syncedLyrics, duration, "LRCLIB")
    : null;
}
