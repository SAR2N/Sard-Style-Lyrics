import { describe, it, expect, vi } from "vitest";
import { errorMessage, retryDelay, waitForRetry } from "../services/errors";
describe("native lyrics failures", () => {
  it("preserves string errors returned by Tauri instead of masking their cause", () =>
    expect(
      errorMessage("LRCLIB busy or rate limited. Retry after 2 seconds."),
    ).toContain("Retry after 2"));
  it("honors the server cooldown and identifies transient connection errors", () => {
    expect(retryDelay("LRCLIB busy. Retry after 2 seconds.")).toBe(2600);
    expect(retryDelay("Lyrics network unavailable: connection refused")).toBe(
      1200,
    );
    expect(retryDelay("Lyrics service returned 401")).toBeNull();
  });
  it("cancels a pending retry when tracks change", async () => {
    vi.useFakeTimers();
    try {
      const controller = new AbortController();
      const pending = waitForRetry(60000, controller.signal);
      const result = expect(pending).rejects.toThrow();
      controller.abort();
      await result;
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
});
