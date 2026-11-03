import { describe, it, expect } from "vitest";
import { parseRecord } from "../lyrics/record";
import type { LyricsRecord } from "../types";
const base: LyricsRecord = {
  id: 1,
  trackName: "Original",
  artistName: "Studio",
  albumName: "",
  duration: 8,
  instrumental: false,
  plainLyrics: null,
  syncedLyrics: "[00:00]Fallback line",
};
describe("LRCLIB Lyricsfile", () => {
  it("preserves source word timestamps and whitespace", () => {
    const result = parseRecord(
      {
        ...base,
        lyricsfile:
          'version: "1.0"\nlines:\n  - text: "Stay here"\n    start_ms: 1000\n    end_ms: 4000\n    words:\n      - {text: "Stay ", start_ms: 1000, end_ms: 2000}\n      - {text: "here", start_ms: 2500, end_ms: 4000}',
      },
      8,
    )!;
    expect(result.approximate).toBe(false);
    expect(result.lines[0].words[1].start).toBe(2.5);
    expect(result.lines[0].words.map((w) => w.text).join("")).toBe("Stay here");
  });
  it("does not treat unknown versions as current", () =>
    expect(
      parseRecord({ ...base, lyricsfile: 'version: "9.0"\nlines: []' }, 8)!
        .source,
    ).toBe("LRCLIB"));
  it("labels malformed word timing as approximate", () =>
    expect(
      parseRecord(
        {
          ...base,
          lyricsfile:
            'version: "1.0"\nlines:\n  - {text: "Original words", start_ms: 1000, words: [{text: "bad", start_ms: -1}]}',
        },
        8,
      )!.approximate,
    ).toBe(true));
});
