import { describe, expect, it } from "vitest";

import { AsyncSemaphore } from "../src/core/semaphore.js";

describe("AsyncSemaphore", () => {
  it("limits concurrency to max permits", async () => {
    const semaphore = new AsyncSemaphore(1);
    const events: string[] = [];

    const first = await semaphore.acquire();
    events.push("acquired-1");

    const secondAcquirePromise = semaphore.acquire().then((release) => {
      events.push("acquired-2");
      release();
      events.push("released-2");
    });

    await Promise.resolve();
    events.push("tick");

    first();
    events.push("released-1");

    await secondAcquirePromise;

    expect(events[0]).toBe("acquired-1");
    expect(events.includes("acquired-2")).toBe(true);
    expect(events.indexOf("acquired-2")).toBeGreaterThan(events.indexOf("released-1"));
  });
});
