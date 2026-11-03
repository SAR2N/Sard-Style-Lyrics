import type { Lyrics, LyricLine } from "../types";
const stamp = "(\\d{1,3}):([0-5]\\d)(?:[.:](\\d{1,3}))?";
const seconds = (m: RegExpMatchArray) =>
  Number(m[1]) * 60 + Number(m[2]) + Number(`0.${m[3] ?? "0"}`);
/** Supports repeated timestamps, global offsets, and enhanced LRC absolute word tags. */
export function parseLrc(
  raw: string,
  duration = 300,
  source = "Imported LRC",
): Lyrics {
  if (raw.length > 2_000_000) throw new Error("LRC exceeds 2 MB limit.");
  const offset = Number(raw.match(/\[offset:([+-]?\d+)\]/i)?.[1] ?? 0) / 1000;
  const rows: {
    start: number;
    text: string;
    tagged: { start: number; text: string }[];
  }[] = [];
  for (const row of raw.replace(/^\uFEFF/, "").split(/\r?\n/)) {
    const times = [...row.matchAll(new RegExp(`\\[${stamp}\\]`, "g"))];
    if (!times.length) continue;
    const body = row.replace(new RegExp(`\\[${stamp}\\]`, "g"), "").trim();
    const tags = [...body.matchAll(new RegExp(`<${stamp}>([^<]*)`, "g"))];
    const text = body.replace(/<[^>]*>/g, "").trim();
    for (const t of times) {
      const delta = seconds(t) - seconds(times[0]);
      rows.push({
        start: Math.max(0, seconds(t) + offset),
        text,
        tagged: tags
          .map((x) => ({
            start: Math.max(0, seconds(x) + offset + delta),
            text: x[4],
          }))
          .filter((x) => x.text.trim()),
      });
    }
  }
  rows.sort((a, b) => a.start - b.start);
  // Duplicate timestamps often represent translations. Keep one to avoid zero-duration phrases.
  const unique = rows.filter((r, i) => !i || r.start !== rows[i - 1].start);
  const lines: LyricLine[] = unique.map((r, i) => {
    const end = Math.max(
      r.start + 0.05,
      unique[i + 1]?.start ?? Math.max(duration, r.start + 4),
    );
    const valid =
      r.tagged.length > 0 &&
      r.tagged.every(
        (w, j) =>
          w.start >= r.start &&
          w.start < end &&
          (!j || w.start > r.tagged[j - 1].start),
      );
    const tokens = r.text.split(/\s+/).filter(Boolean);
    const words = valid
      ? r.tagged.map((w, j) => ({ ...w, end: r.tagged[j + 1]?.start ?? end }))
      : tokens.map((text, j) => ({
          text: text + (j < tokens.length - 1 ? " " : ""),
          start: r.start + ((end - r.start) * j) / tokens.length,
          end: r.start + ((end - r.start) * (j + 1)) / tokens.length,
        }));
    return { text: r.text, start: r.start, end, words, precise: valid };
  });
  return {
    lines,
    source,
    approximate: lines.some((x) => x.words.length > 0 && !x.precise),
  };
}
