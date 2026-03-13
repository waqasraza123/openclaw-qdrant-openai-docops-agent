import { QdrantClient } from "@qdrant/js-client-rest";

import { appConfig } from "../config/env.js";

const qdrantClientParams = appConfig.QDRANT_API_KEY
  ? { url: appConfig.QDRANT_URL, apiKey: appConfig.QDRANT_API_KEY, timeout: appConfig.REQUEST_TIMEOUT_MS }
  : { url: appConfig.QDRANT_URL, timeout: appConfig.REQUEST_TIMEOUT_MS };

export const qdrantClient = new QdrantClient(qdrantClientParams);

const parseCollectionVectorSize = (collectionInfo: unknown) => {
  const root = collectionInfo as Record<string, unknown> | null;
  const result =
    root && typeof root["result"] === "object" && root["result"] !== null
      ? (root["result"] as Record<string, unknown>)
      : root;
  const config =
    result && typeof result["config"] === "object" && result["config"] !== null
      ? (result["config"] as Record<string, unknown>)
      : null;
  const params =
    config && typeof config["params"] === "object" && config["params"] !== null
      ? (config["params"] as Record<string, unknown>)
      : null;
  const vectors = params ? params["vectors"] : undefined;

  if (!vectors || typeof vectors !== "object") return null;

  const vectorsRecord = vectors as Record<string, unknown>;
  const directSize = vectorsRecord["size"];
  if (typeof directSize === "number") return directSize;

  for (const value of Object.values(vectorsRecord)) {
    if (!value || typeof value !== "object") continue;
    const size = (value as Record<string, unknown>)["size"];
    if (typeof size === "number") return size;
  }

  return null;
};

export const ensureQdrantCollection = async (params: {
  collectionName: string;
  vectorSize: number;
}): Promise<void> => {
  const { collectionName, vectorSize } = params;

  const collections = await qdrantClient.getCollections();
  const exists = collections.collections.some((c) => c.name === collectionName);

  if (!exists) {
    await qdrantClient.createCollection(collectionName, {
      vectors: { size: vectorSize, distance: "Cosine" }
    });
    return;
  }

  const info = await qdrantClient.getCollection(collectionName);
  const existingSize = parseCollectionVectorSize(info);

  if (typeof existingSize !== "number") {
    throw new Error(`Qdrant collection ${collectionName} missing vectors config`);
  }

  if (existingSize !== vectorSize) {
    throw new Error(
      `Qdrant collection ${collectionName} vector size mismatch: ${existingSize} != ${vectorSize}`
    );
  }
};
