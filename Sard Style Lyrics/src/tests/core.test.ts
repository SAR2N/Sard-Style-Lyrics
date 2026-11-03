import { describe, it, expect } from "vitest";
import { parseLrc } from "../lyrics/parser";
import { PlaybackClock } from "../engine/clock";
import { frameAt } from "../engine/motion";
describe("LRC parsing", () => {
  it("parses fractions, metadata, repeated stamps and offsets", () => {
    const l = parseLrc(
      "[ar:Original]\n[offset:-500]\n[00:02.50][00:06.500]hello world\n[00:10]end",
      14,
    );
    expect(l.lines.map((x) => x.start)).toEqual([2, 6, 9.5]);
    expect(l.lines[0].words[0].start).toBe(2);
    expect(l.approximate).toBe(true);
  });
  it("uses enhanced word tags without claiming interpolation is precise", () => {
    const l = parseLrc(
      "[00:01]<00:01.00>Hello <00:02.50>there\n[00:04]next",
      8,
    );
    expect(l.lines[0].precise).toBe(true);
    expect(l.lines[0].words[1]).toEqual({ text: "there", start: 2.5, end: 4 });
    expect(l.lines[1].precise).toBe(false);
  });
  it("handles missing lyrics, empty instrumental sections and malformed tags", () => {
    expect(parseLrc("not timed").lines).toEqual([]);
    expect(parseLrc("[00:01]\n[00:02]word", 4).lines[0].words).toEqual([]);
    expect(parseLrc("[00:01]<00:03>bad <00:02>order", 5).lines[0].precise).toBe(
      false,
    );
  });
  it("sorts and deduplicates without zero-duration rows", () => {
    const l = parseLrc("[00:03]b\n[00:01]a\n[00:01]translation", 5);
    expect(l.lines).toHaveLength(2);
    expect(l.lines.every((x) => x.end > x.start)).toBe(true);
  });
});
describe("playback synchronization", () => {
  it("tracks media-session playback rates", () => {
    let now = 0;
    const c = new PlaybackClock(() => now);
    c.update("rate", 10, true, "media", 1.5);
    now = 2000;
    expect(c.position()).toBe(13);
  });
  let now = 0;
  const create = () => {
    now = 0;
    return new PlaybackClock(() => now);
  };
  it("maintains monotonic progression and reconciles modest drift", () => {
    const c = create();
    c.update("a", 10, true);
    now = 1000;
    expect(c.position()).toBe(11);
    c.update("a", 11.2, true);
    expect(c.position()).toBeCloseTo(11.06);
  });
  it("pauses and resumes without wall-clock jumps", () => {
    const c = create();
    c.update("a", 10, true);
    now = 1000;
    c.update("a", 11, false);
    now = 10000;
    expect(c.position()).toBe(11);
    c.resume();
    now = 11000;
    expect(c.position()).toBe(12);
  });
  it("detects seeks and track switches", () => {
    const c = create();
    c.update("a", 10, true);
    c.update("a", 50, true);
    expect(c.lastEvent).toBe("seek");
    expect(c.position()).toBe(50);
    c.update("b", 2, true);
    expect(c.lastEvent).toBe("track");
    expect(c.position()).toBe(2);
  });
  it("labels approximate, manual, unknown and stale timing", () => {
    const c = create();
    expect(c.confidence(true)).toBe("No timeline");
    c.update("a", 0, true);
    expect(c.confidence(true)).toContain("approximate");
    now = 6000;
    expect(c.confidence(false)).toContain("Stale");
    c.update("a", 0, true, "manual");
    expect(c.confidence(false)).toContain("estimated");
  });
});
describe("deterministic motion", () => {
  it('keeps one marker during gaps in source word timing, also in full-line mode',()=>{const lyrics={source:'Original fixture',approximate:false,lines:[{text:'Stay here',start:0,end:3,precise:true,words:[{text:'Stay ',start:.2,end:.6},{text:'here',start:1.2,end:2}]}]};expect(frameAt(lyrics,.8,1,1)!.focusIndex).toBe(0);expect(frameAt(lyrics,1.5,1,1,0,true)!.focusIndex).toBe(1);expect(frameAt(lyrics,.1,1,1)!.focusIndex).toBe(0);});
  it("transitions continuously across word boundaries", () => {
    const lyric = parseLrc("[00:00]One two", 4);
    const before = frameAt(lyric, 1.999, 1, 1)!;
    const after = frameAt(lyric, 2.001, 1, 1)!;
    expect(
      Math.abs(before.words[0].opacity - after.words[0].opacity),
    ).toBeLessThan(0.01);
    expect(Math.abs(before.words[1].scale - after.words[1].scale)).toBeLessThan(
      0.01,
    );
  });
  const l = parseLrc("[00:00]This is original\n[00:04]Another line", 8);
  it("reproduces identical states after a seek", () => {
    const a = frameAt(l, 2, 0.6, 1);
    frameAt(l, 6, 0.6, 1);
    expect(frameAt(l, 2, 0.6, 1)).toEqual(a);
  });
  it("emphasizes the current word while showing upcoming words in gray", () => {
    const f = frameAt(l, 0.5, 1, 1)!;
    expect(f.words[0].active).toBe(true);
    expect(f.words[0].opacity).toBe(1);
    expect(f.words[2].opacity).toBeGreaterThan(0);
    expect(f.words[2].opacity).toBeLessThan(f.words[0].opacity);
  });
  it("has no content before or after its timeline", () => {
    expect(frameAt(l, -1, 1, 1)).toBeNull();
    expect(frameAt(l, 9, 1, 1)).toBeNull();
  });
  it("disables word emphasis in line mode", () =>
    expect(
      frameAt(l, 2, 1, 1, 0, true)!.words.every(
        (w) => w.opacity === 1 && w.scale === 1,
      ),
    ).toBe(true));
});
