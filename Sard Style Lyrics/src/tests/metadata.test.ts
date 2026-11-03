import { describe, it, expect } from "vitest";
import { lyricIdentities } from "../lyrics/metadata";
describe("YouTube media metadata", () => {
  it("extracts the user-reported Eminem title and corroborated channel", () =>
    expect(lyricIdentities("Eminem - Lose Yourself", "EminemMusic")[0]).toEqual(
      { artist: "Eminem", title: "Lose Yourself" },
    ));
  it("handles VEVO and official video suffixes", () =>
    expect(
      lyricIdentities(
        "Artist — Original song (Official Video)",
        "ArtistVEVO",
      )[0],
    ).toEqual({ artist: "Artist", title: "Original song" }));
  it("does not mistake an ordinary song title containing a dash for artist metadata", () =>
    expect(lyricIdentities("Original song - Live", "Artist")).toEqual([
      { title: "Original song - Live", artist: "Artist" },
    ]));
  it("preserves remix qualifiers", () =>
    expect(
      lyricIdentities("Artist - Original song (Remix)", "ArtistMusic")[0].title,
    ).toBe("Original song (Remix)"));
});
