import { QdrantClient } from "@qdrant/js-client-rest";

import { appConfig } from "../config/env.js";

const qdrantClientParams = appConfig.QDRANT_API_KEY
  ? { url: appConfig.QDRANT_URL, apiKey: appConfig.QDRANT_API_KEY, timeout: appConfig.REQUEST_TIMEOUT_MS }
  : { url: appConfig.QDRANT_URL, timeout: appConfig.REQUEST_TIMEOUT_MS };

export const qdrantClient = new QdrantClient(qdrantClientParams);

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
  const existingSize = info.config.params.vectors?.size;

  if (typeof existingSize !== "number") {
    throw new Error(`Qdrant collection ${collectionName} missing vectors config`);
  }

  if (existingSize !== vectorSize) {
    throw new Error(
      `Qdrant collection ${collectionName} vector size mismatch: ${existingSize} != ${vectorSize}`
    );
  }
};
