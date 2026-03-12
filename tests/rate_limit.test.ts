import { describe, expect, it } from "vitest";

import { FixedWindowRateLimiter } from "../src/core/rateLimit.js";

describe("FixedWindowRateLimiter", () => {
  it("allows up to max in the same minute window", () => {
    const limiter = new FixedWindowRateLimiter(2);
    const now = 1_000_000;

    expect(limiter.allowRequest(now)).toBe(true);
    expect(limiter.allowRequest(now + 1)).toBe(true);
    expect(limiter.allowRequest(now + 2)).toBe(false);
  });

  it("resets after window passes", () => {
    const limiter = new FixedWindowRateLimiter(1);
    const now = 1_000_000;

    expect(limiter.allowRequest(now)).toBe(true);
    expect(limiter.allowRequest(now + 10)).toBe(false);
    expect(limiter.allowRequest(now + 60_001)).toBe(true);
  });
});
