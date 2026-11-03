import { defaults, type Settings } from "../types";
export function readSettings(): Settings {
  try {
    const s = JSON.parse(localStorage.getItem("kinetic.settings") ?? "{}");
    return {
      ...defaults,
      ...s,
      size: Math.min(160, Math.max(32, Number(s.size) || defaults.size)),
      offset: Math.min(10, Math.max(-10, Number(s.offset) || 0)),
    };
  } catch {
    return defaults;
  }
}
export function saveSettings(s: Settings) {
  try {
    localStorage.setItem("kinetic.settings", JSON.stringify(s));
  } catch {
    /* UI can still operate with storage disabled. */
  }
}
export class Cache<T> {
  constructor(
    private namespace: string,
    private max = 100,
  ) {}
  get(key: string): T | null {
    try {
      const v = JSON.parse(
        localStorage.getItem(this.namespace + key) ?? "null",
      );
      return v && Date.now() - v.at < 30 * 86400000 ? v.value : null;
    } catch {
      return null;
    }
  }
  set(key: string, value: T) {
    try {
      const keys = Object.keys(localStorage).filter((k) =>
        k.startsWith(this.namespace),
      );
      if (keys.length >= this.max)
        localStorage.removeItem(
          keys.sort(
            (a, b) =>
              JSON.parse(localStorage.getItem(a)!).at -
              JSON.parse(localStorage.getItem(b)!).at,
          )[0],
        );
      localStorage.setItem(
        this.namespace + key,
        JSON.stringify({ at: Date.now(), value }),
      );
    } catch {
      /* Quota exhausted: preserve current session. */
    }
  }
  clear() {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(this.namespace))
      .forEach((k) => localStorage.removeItem(k));
  }
}
