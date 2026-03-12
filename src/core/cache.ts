import fs from "node:fs/promises";
import path from "node:path";

import { appConfig } from "../config/env.js";

type CacheEnvelope<T> = {
  expiresAtEpochMs: number;
  value: T;
};

const ensureCacheDirectory = async () => {
  await fs.mkdir(appConfig.CACHE_DIR, { recursive: true });
};

const cachePathForKey = (cacheKey: string) => path.join(appConfig.CACHE_DIR, `${cacheKey}.json`);

export const readCacheValue = async <T>(cacheKey: string): Promise<T | null> => {
  if (!appConfig.CACHE_ENABLED) return null;

  await ensureCacheDirectory();
  const filePath = cachePathForKey(cacheKey);

  try {
    const raw = await fs.readFile(filePath, "utf8");
    const envelope = JSON.parse(raw) as CacheEnvelope<T>;
    if (Date.now() > envelope.expiresAtEpochMs) {
      await fs.unlink(filePath).catch(() => undefined);
      return null;
    }
    return envelope.value;
  } catch {
    return null;
  }
};

export const writeCacheValue = async <T>(cacheKey: string, value: T): Promise<void> => {
  if (!appConfig.CACHE_ENABLED) return;

  await ensureCacheDirectory();
  const filePath = cachePathForKey(cacheKey);

  const envelope: CacheEnvelope<T> = {
    expiresAtEpochMs: Date.now() + appConfig.CACHE_TTL_SECONDS * 1000,
    value
  };

  await fs.writeFile(filePath, JSON.stringify(envelope), "utf8");
};
