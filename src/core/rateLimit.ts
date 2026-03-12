export class FixedWindowRateLimiter {
  private readonly maxRequests: number;
  private readonly windowMs: number;

  private currentWindowId: number | null = null;
  private currentWindowCount = 0;

  constructor(...args: unknown[]) {
    const resolved = FixedWindowRateLimiter.resolveConfig(args);
    this.maxRequests = resolved.maxRequests;
    this.windowMs = resolved.windowMs;
  }

  private static resolveConfig(args: unknown[]) {
    if (args.length === 2 && typeof args[0] === "number" && typeof args[1] === "number") {
      return { maxRequests: args[0], windowMs: args[1] };
    }

    if (args.length === 1 && typeof args[0] === "number") {
      const maxRequests = args[0];
      const windowMs = 60000;
      return { maxRequests, windowMs };
    }

    if (args.length === 1 && args[0] && typeof args[0] === "object") {
      const record = args[0] as Record<string, unknown>;

      const maxCandidates = [
        record["maxRequests"],
        record["max_requests"],
        record["maxPerMinute"],
        record["max_per_minute"],
        record["requestsPerMinute"],
        record["requests_per_minute"],
        record["limit"],
        record["rpm"]
      ];

      const windowCandidates = [
        record["windowMs"],
        record["window_ms"],
        record["windowSeconds"],
        record["window_seconds"]
      ];

      const maxValue = maxCandidates.find((v) => typeof v === "number") as number | undefined;
      const windowMsValue = windowCandidates.find((v) => typeof v === "number") as number | undefined;

      const hasPerMinuteKey =
        "maxPerMinute" in record ||
        "max_per_minute" in record ||
        "requestsPerMinute" in record ||
        "requests_per_minute" in record ||
        "rpm" in record;

      const maxRequests = maxValue;
      if (!maxRequests || !Number.isFinite(maxRequests) || maxRequests <= 0) {
        throw new Error("FixedWindowRateLimiter requires max requests > 0");
      }

      if (typeof windowMsValue === "number") {
        const seconds =
          typeof record["windowSeconds"] === "number" ? (record["windowSeconds"] as number) : null;
        const derivedWindowMs = seconds !== null ? seconds * 1000 : windowMsValue;
        if (!Number.isFinite(derivedWindowMs) || derivedWindowMs <= 0) {
          throw new Error("FixedWindowRateLimiter requires windowMs > 0");
        }
        return { maxRequests, windowMs: derivedWindowMs };
      }

      if (hasPerMinuteKey) {
        return { maxRequests, windowMs: 60000 };
      }

      throw new Error("FixedWindowRateLimiter requires windowMs when not using per-minute config");
    }

    throw new Error("FixedWindowRateLimiter invalid constructor arguments");
  }

  allowRequest(nowMs: number): boolean {
    const windowId = Math.floor(nowMs / this.windowMs);
    if (this.currentWindowId !== windowId) {
      this.currentWindowId = windowId;
      this.currentWindowCount = 0;
    }

    if (this.currentWindowCount >= this.maxRequests) return false;

    this.currentWindowCount += 1;
    return true;
  }
}
