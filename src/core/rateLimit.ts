export class FixedWindowRateLimiter {
  private currentWindowStartEpochMs: number;
  private requestCountInWindow: number;

  constructor(private readonly maxRequestsPerMinute: number) {
    if (maxRequestsPerMinute <= 0) throw new Error("maxRequestsPerMinute must be > 0");
    this.currentWindowStartEpochMs = Date.now();
    this.requestCountInWindow = 0;
  }

  allowRequest(nowEpochMs: number): boolean {
    const windowMs = 60_000;
    if (nowEpochMs - this.currentWindowStartEpochMs >= windowMs) {
      this.currentWindowStartEpochMs = nowEpochMs;
      this.requestCountInWindow = 0;
    }

    if (this.requestCountInWindow >= this.maxRequestsPerMinute) return false;

    this.requestCountInWindow += 1;
    return true;
  }
}
