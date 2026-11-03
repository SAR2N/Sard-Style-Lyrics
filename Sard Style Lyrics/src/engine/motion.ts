import type { Lyrics } from "../types";
const clamp = (x: number) => Math.max(0, Math.min(1, x));
const smooth = (x: number) => {
  const t = clamp(x);
  return t * t * (3 - 2 * t);
};
export function frameAt(
  lyrics: Lyrics,
  time: number,
  intensity: number,
  speed: number,
  level = 0,
  lineMode = false,
) {
  const index = lyrics.lines.findIndex((l) => time >= l.start && time < l.end);
  if (index < 0) return null;
  const line = lyrics.lines[index],
    enter = smooth((time - line.start) * 3 * speed),
    exit = smooth((line.end - time) * 4 * speed);
  const seed = (index * 16807 + 71) % 97,
    direction = seed % 2 ? 1 : -1;
  // Keep one reading marker visible even between source word timestamps.
  let focusIndex=-1;
  line.words.forEach((word,i)=>{if(time>=word.start)focusIndex=i;});
  if(focusIndex<0&&line.words.length)focusIndex=0;
  return {
    index,
    focusIndex,
    line,
    opacity: Math.min(enter, exit),
    x: direction * (1 - enter) * 6 * intensity,
    y: ((seed % 3) - 1) * (1 - enter) * 4 * intensity,
    scale:
      1 + (1 - enter) * 0.008 * intensity + clamp(level) * 0.002 * intensity,
    words: line.words.map((w) => {
      const active = time >= w.start && time < w.end;
      const past = time >= w.end;
      const emphasis =
        smooth((time - w.start) / 0.12) * smooth((w.end - time) / 0.12);
      const after = smooth((time - w.end) / 0.12);
      return {
        text: w.text,
        opacity: lineMode
          ? 1
          : past
            ? 0.38 - after * 0.1
            : 0.38 + emphasis * 0.62,
        scale: lineMode ? 1 : 1 + 0.012 * intensity * emphasis,
        y: 0,
        active,
      };
    }),
  };
}
