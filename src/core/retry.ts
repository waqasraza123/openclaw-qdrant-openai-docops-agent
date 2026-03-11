import { setTimeout as delay } from "node:timers/promises";

export type RetryOptions = {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  isRetryable: (error: unknown) => boolean;
};

export const executeWithRetry = async <T>(
  operationName: string,
  operation: () => Promise<T>,
  options: RetryOptions
): Promise<{ result: T; attemptCount: number }> => {
  let attempt = 0;
  let delayMs = options.initialDelayMs;

  while (true) {
    attempt += 1;
    try {
      const result = await operation();
      return { result, attemptCount: attempt };
    } catch (error) {
      const retryable = options.isRetryable(error);
      const canRetry = retryable && attempt < options.maxAttempts;

      if (!canRetry) {
        const enhancedError = new Error(`${operationName} failed after ${attempt} attempts`);
        (enhancedError as { cause?: unknown }).cause = error;
        throw enhancedError;
      }

      const jitterMs = Math.floor(Math.random() * Math.min(250, delayMs));
      await delay(delayMs + jitterMs);
      delayMs = Math.min(options.maxDelayMs, delayMs * 2);
    }
  }
};
