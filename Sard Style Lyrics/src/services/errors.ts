export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  return "Lyrics service unavailable. Check your connection and try again.";
}
export function retryDelay(error: unknown): number | null {
  const text = errorMessage(error);
  const seconds = text.match(/retry after (\d+) seconds/i);
  if (seconds) return Math.max(1, Number(seconds[1])) * 1000 + 600;
  if (
    /network unavailable|failed to fetch|fetch failed|returned (500|502|504)|TimeoutError/i.test(
      text,
    )
  )
    return 1200;
  return null;
}
export function waitForRetry(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    signal.throwIfAborted();
    const abort = () => {
      clearTimeout(timer);
      reject(signal.reason);
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", abort);
      resolve();
    }, ms);
    signal.addEventListener("abort", abort, { once: true });
  });
}
