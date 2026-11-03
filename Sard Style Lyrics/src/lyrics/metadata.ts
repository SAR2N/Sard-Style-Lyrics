/** Presentation cleanup never removes recording qualifiers such as live/remix. */
export const normalizeMetadata = (text: string) =>
  text
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, "");
export const cleanMetadata = (text: string) =>
  text
    .replace(/\s*[-–]\s*Topic\s*$/i, "")
    .replace(
      /\s*[\[(](?:official\s+)?(?:music\s+)?(?:video|audio|lyrics?|lyric video|visuali[sz]er)(?:\s+(?:hd|4k))?[\])]\s*$/i,
      "",
    )
    .replace(/\s*[\[(](?:hd|4k)[\])]\s*$/i, "")
    .trim();
const channelKey = (text: string) =>
  normalizeMetadata(text).replace(
    /(?:(?:official|music|vevo|records|topic|channel))+$/,
    "",
  );
export function lyricIdentities(title: string, artist: string) {
  const direct = { title: cleanMetadata(title), artist: cleanMetadata(artist) };
  const parts = direct.title.split(/\s+[-–—]\s+/);
  if (
    parts.length >= 2 &&
    channelKey(parts[0]) &&
    channelKey(parts[0]) === channelKey(direct.artist)
  ) {
    // A corroborated "Artist - Title" video title is more useful than its channel name.
    return [
      { artist: parts[0].trim(), title: parts.slice(1).join(" - ").trim() },
      direct,
    ];
  }
  return [direct];
}
