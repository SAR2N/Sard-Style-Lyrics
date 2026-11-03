import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { LrclibProvider, lyricsCache, recordingKey } from "../services/lyrics";
const track = {
  id: "a",
  title: "Original Song",
  artist: "Original Artist",
  album: "Original Album",
  duration: 120,
};
const record = {
  id: 42,
  trackName: track.title,
  artistName: track.artist,
  albumName: track.album,
  duration: 120,
  syncedLyrics: "[00:00]Original words",
  plainLyrics: null,
  instrumental: false,
};
beforeEach(() => {
  const data = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => {
      data.set(k, v);
    },
    removeItem: (k: string) => {
      data.delete(k);
    },
  });
});
afterEach(() => {
  lyricsCache.clear();
  vi.unstubAllGlobals();
});
describe("lyrics provider boundaries", () => {
  it('selects different timestamps and skips duplicate editions and wrong songs',async()=>{
    const alternate={...record,id:43,syncedLyrics:'[00:02]Original words'};
    vi.stubGlobal('fetch',vi.fn().mockImplementation(async()=>new Response(JSON.stringify([record,{...record,id:99},{...alternate,artistName:'Other artist'},alternate]))));
    const provider=new LrclibProvider(), excluded=new Set([recordingKey(record)]);
    expect(await provider.alternative(track,excluded,new AbortController().signal)).toEqual(alternate);
    excluded.add(recordingKey(alternate));
    expect(await provider.alternative(track,excluded,new AbortController().signal)).toBeNull();
  });
  it("retrieves timed lyrics using the exact metadata shown in the user screenshot", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 404 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              ...record,
              trackName: "Lose Yourself",
              artistName: "Eminem",
              duration: 326,
            },
          ]),
          { status: 200 },
        ),
      );
    vi.stubGlobal("fetch", fetch);
    const result = await new LrclibProvider().get(
      {
        ...track,
        title: "Eminem - Lose Yourself",
        artist: "EminemMusic",
        album: "",
        duration: 327,
      },
      new AbortController().signal,
    );
    expect(result?.trackName).toBe("Lose Yourself");
    expect(String(fetch.mock.calls[0][0])).toContain(
      "track_name=Lose+Yourself&artist_name=Eminem",
    );
    expect(String(fetch.mock.calls[0][0])).not.toContain("EminemMusic");
    expect(String(fetch.mock.calls[1][0])).toContain("artist_name=Eminem");
  });
  it("finds timed lyrics for the same recording on a different album edition", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 404 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([{ ...record, albumName: "Deluxe edition" }]),
          { status: 200 },
        ),
      );
    vi.stubGlobal("fetch", fetch);
    expect(
      (await new LrclibProvider().get(track, new AbortController().signal))
        ?.albumName,
    ).toBe("Deluxe edition");
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it("retries a temporary HTTP 503 before giving up", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(null, { status: 503, headers: { "Retry-After": "1" } }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(record), { status: 200 }),
      );
    vi.stubGlobal("fetch", fetch);
    const progress = vi.fn();
    expect(
      await new LrclibProvider().get(
        track,
        new AbortController().signal,
        progress,
      ),
    ).toEqual(record);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(progress).toHaveBeenCalled();
  });
  it("caches successful matches and serves them offline", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify(record), { status: 200 }));
    vi.stubGlobal("fetch", fetch);
    const provider = new LrclibProvider();
    expect(await provider.get(track, new AbortController().signal)).toEqual(
      record,
    );
    fetch.mockRejectedValue(new Error("offline"));
    expect(await provider.get(track, new AbortController().signal)).toEqual(
      record,
    );
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("rejects mismatched durations", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(
        async () =>
          new Response(JSON.stringify({ ...record, duration: 160 }), {
            status: 200,
          }),
      ),
    );
    expect(
      await new LrclibProvider().get(track, new AbortController().signal),
    ).toBeNull();
  });
  it("returns a missing-lyrics result for HTTP 404", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 404 })),
    );
    expect(
      await new LrclibProvider().get(track, new AbortController().signal),
    ).toBeNull();
  });
  it("does not initiate cancelled track requests", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const controller = new AbortController();
    controller.abort();
    await expect(
      new LrclibProvider().get(track, controller.signal),
    ).rejects.toThrow();
    expect(fetch).not.toHaveBeenCalled();
  });
});
