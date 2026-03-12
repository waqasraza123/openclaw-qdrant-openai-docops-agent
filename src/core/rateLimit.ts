export class FixedWindowRateLimiter {
  private currentWindowId: number | null = null;
  private currentWindowCount = 0;

  private currentWindowStartEpochMs: number;
  private requestCountInWindow: number;

  constructor(private readonly maxRequestsPerMinute: number) {
    if (maxRequestsPerMinute <= 0) throw new Error("maxRequestsPerMinute must be > 0");
    this.currentWindowStartEpochMs = Date.now();
    this.requestCountInWindow = 0;
  }

  allowRequest(nowMs: number): boolean {
    const windowMs = this.windowMs;
    const windowId = Math.floor(nowMs / windowMs);
    if (this.currentWindowId !== windowId) {
      this.currentWindowId = windowId;
      this.currentWindowCount = 0;
    }
    if (this.currentWindowCount >= this.maxRequests) return false;
    this.currentWindowCount += 1;
    return true;
  }

}
