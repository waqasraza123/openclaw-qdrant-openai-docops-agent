import OpenAI from "openai";

import { appConfig } from "../config/env.js";

export const openaiClient = new OpenAI({
  apiKey: appConfig.OPENAI_API_KEY,
  maxRetries: appConfig.OPENAI_MAX_RETRIES,
  timeout: appConfig.OPENAI_TIMEOUT_MS
});

export const createEmbeddingVectors = async (inputs: string[]) => {
  const response = await openaiClient.embeddings.create({
    model: appConfig.OPENAI_EMBED_MODEL,
    input: inputs,
    encoding_format: "float"
  });

  const vectors = response.data.map((item) => item.embedding);

  if (vectors.length !== inputs.length) {
    throw new Error(`Embedding response size mismatch: got ${vectors.length}, expected ${inputs.length}`);
  }

  return { vectors, usage: response.usage };
};
