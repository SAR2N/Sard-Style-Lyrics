export type ClockSource = "media" | "manual" | "recognition" | "unknown";
/** Monotonic time is injected to make pause, seek and drift behavior testable. */
export class PlaybackClock {
  private anchor = 0;
  private at = 0;
  private running = false;
  private key = "";
  private rate = 1;
  source: ClockSource = "unknown";
  lastVerified = 0;
  lastEvent = "waiting";
  constructor(private now: () => number = () => performance.now()) {
    this.at = now();
  }
  position() {
    return Math.max(
      0,
      this.anchor +
        (this.running ? ((this.now() - this.at) / 1000) * this.rate : 0),
    );
  }
  get playing() {
    return this.running;
  }
  get age() {
    return (this.now() - this.lastVerified) / 1000;
  }
  update(
    key: string,
    position: number,
    playing: boolean,
    source: ClockSource = "media",
    rate = 1,
  ) {
    const current = this.position(),
      changed = key !== this.key;
    const drift = position - current;
    this.lastEvent = changed
      ? "track"
      : Math.abs(drift) > 1.25
        ? "seek"
        : playing !== this.running
          ? playing
            ? "resume"
            : "pause"
          : "drift";
    // Never smooth track switches, seeks or paused positions.
    this.anchor =
      changed || Math.abs(drift) > 1.25 || !playing || playing !== this.running
        ? position
        : current + drift * 0.3;
    this.at = this.now();
    this.running = playing;
    this.rate = Number.isFinite(rate) && rate >= 0 && rate <= 4 ? rate : 1;
    this.key = key;
    this.source = source;
    this.lastVerified = this.at;
  }
  seek(position: number) {
    this.anchor = Math.max(0, position);
    this.at = this.now();
    this.lastEvent = "seek";
  }
  pause() {
    this.anchor = this.position();
    this.at = this.now();
    this.running = false;
  }
  resume() {
    this.at = this.now();
    this.running = true;
  }
  reset() {
    this.pause();
    this.seek(0);
    this.key = "";
    this.rate = 1;
    this.source = "unknown";
  }
  confidence(approximate: boolean, wordMode = true) {
    return this.source === "unknown"
      ? "No timeline"
      : this.source === "manual"
        ? "Manual anchor · estimated"
        : this.source === "recognition"
          ? "Recognition anchor · estimated"
          : this.age > 4
            ? "Stale timeline · estimated"
            : !wordMode
              ? "Session timeline · source line timestamps"
              : approximate
                ? "Session timeline · approximate words"
                : "Session timeline · source word tags";
  }
}
