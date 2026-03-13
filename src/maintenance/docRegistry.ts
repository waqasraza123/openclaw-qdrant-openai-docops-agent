import { createHash } from "node:crypto";

import { ensureQdrantCollection, qdrantClient } from "../core/qdrant.js";

export type DocRegistryEntry = {
  doc_id: string;
  source: string;
  page_count: number | null;
  chunk_count: number;
  content_hash: string;
  embed_model: string;
  chunk_max_tokens: number;
  chunk_overlap_tokens: number;
  created_at: string;
  updated_at: string;
};

export type QdrantDocRegistryClient = {
  getCollections: () => Promise<unknown>;
  createCollection: (collectionName: string, params: unknown) => Promise<unknown>;
  getCollection: (collectionName: string) => Promise<unknown>;
  upsert: (collectionName: string, params: unknown) => Promise<unknown>;
  retrieve: (collectionName: string, params: unknown) => Promise<unknown>;
  scroll: (collectionName: string, params: unknown) => Promise<unknown>;
};

const parseCollectionsList = (collectionsResponse: unknown) => {
  const record = collectionsResponse as Record<string, unknown> | null;
  const collections = record ? record["collections"] : undefined;
  if (!Array.isArray(collections)) return [];
  return collections as unknown[];
};

const parseCollectionName = (value: unknown) => {
  const record = value as Record<string, unknown> | null;
  const name = record ? record["name"] : undefined;
  return typeof name === "string" ? name : null;
};

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

const parsePayloadString = (payload: unknown, key: string) => {
  const record = payload as Record<string, unknown> | null;
  const value = record ? record[key] : undefined;
  return typeof value === "string" ? value : null;
};

const parsePayloadNumber = (payload: unknown, key: string) => {
  const record = payload as Record<string, unknown> | null;
  const value = record ? record[key] : undefined;
  return typeof value === "number" ? value : null;
};

const parsePayloadNullableNumber = (payload: unknown, key: string) => {
  const record = payload as Record<string, unknown> | null;
  const value = record ? record[key] : undefined;
  if (value === null) return null;
  return typeof value === "number" ? value : null;
};

const parseScrollPoints = (response: unknown) => {
  const record = response as Record<string, unknown> | null;
  const points = record ? record["points"] : undefined;
  if (!Array.isArray(points)) return [];
  return points as unknown[];
};

const parseNextPageOffset = (response: unknown) => {
  const record = response as Record<string, unknown> | null;
  const value = record ? record["next_page_offset"] : undefined;
  if (value === undefined || value === null) return null;
  return value;
};

const parseRegistryPayload = (payload: unknown): DocRegistryEntry | null => {
  const doc_id = parsePayloadString(payload, "doc_id");
  const source = parsePayloadString(payload, "source");
  const content_hash = parsePayloadString(payload, "content_hash");
  const embed_model = parsePayloadString(payload, "embed_model");
  const created_at = parsePayloadString(payload, "created_at");
  const updated_at = parsePayloadString(payload, "updated_at");

  const chunk_count = parsePayloadNumber(payload, "chunk_count");
  const chunk_max_tokens = parsePayloadNumber(payload, "chunk_max_tokens");
  const chunk_overlap_tokens = parsePayloadNumber(payload, "chunk_overlap_tokens");
  const page_count = parsePayloadNullableNumber(payload, "page_count");

  if (!doc_id || !source || !content_hash || !embed_model || !created_at || !updated_at) return null;
  if (chunk_count === null || chunk_max_tokens === null || chunk_overlap_tokens === null) return null;

  return {
    doc_id,
    source,
    page_count,
    chunk_count,
    content_hash,
    embed_model,
    chunk_max_tokens,
    chunk_overlap_tokens,
    created_at,
    updated_at
  };
};

const toDeterministicUuid = (value: string) => {
  const hexChars = createHash("sha256").update(value).digest("hex").slice(0, 32).split("");
  hexChars[12] = "5";
  const variantIndex = parseInt(hexChars[16] ?? "0", 16) % 4;
  hexChars[16] = ["8", "9", "a", "b"][variantIndex] ?? "8";

  return [
    hexChars.slice(0, 8).join(""),
    hexChars.slice(8, 12).join(""),
    hexChars.slice(12, 16).join(""),
    hexChars.slice(16, 20).join(""),
    hexChars.slice(20, 32).join("")
  ].join("-");
};

const getDocRegistryPointId = (docId: string) => toDeterministicUuid(`doc-registry:${docId}`);

export const ensureDocRegistryCollection = async (params: {
  registryCollectionName: string;
  client?: QdrantDocRegistryClient;
}): Promise<void> => {
  const registryVectorSize = 1;

  if (!params.client) {
    await ensureQdrantCollection({
      collectionName: params.registryCollectionName,
      vectorSize: registryVectorSize
    });
    return;
  }

  const client = params.client;
  const collectionsResponse = await client.getCollections();
  const collectionsList = parseCollectionsList(collectionsResponse);
  const exists = collectionsList.some((c) => parseCollectionName(c) === params.registryCollectionName);

  if (!exists) {
    await client.createCollection(params.registryCollectionName, {
      vectors: { size: registryVectorSize, distance: "Cosine" }
    });
    return;
  }

  const info = await client.getCollection(params.registryCollectionName);
  const size = parseCollectionVectorSize(info);
  if (size !== registryVectorSize) {
    throw new Error(`Registry collection vector size mismatch: ${size ?? "null"} != ${registryVectorSize}`);
  }
};

export const upsertDocRegistryEntry = async (params: {
  registryCollectionName: string;
  entry: DocRegistryEntry;
  client?: QdrantDocRegistryClient;
}): Promise<void> => {
  const client = params.client ?? (qdrantClient as unknown as QdrantDocRegistryClient);

  if (params.client) {
    await ensureDocRegistryCollection({
      registryCollectionName: params.registryCollectionName,
      client: params.client
    });
  } else {
    await ensureDocRegistryCollection({ registryCollectionName: params.registryCollectionName });
  }

  const pointId = getDocRegistryPointId(params.entry.doc_id);

  await client.upsert(params.registryCollectionName, {
    wait: true,
    points: [
      {
        id: pointId,
        vector: [0],
        payload: params.entry
      }
    ]
  });
};

export const getDocRegistryEntry = async (params: {
  registryCollectionName: string;
  docId: string;
  client?: QdrantDocRegistryClient;
}): Promise<DocRegistryEntry | null> => {
  const client = params.client ?? (qdrantClient as unknown as QdrantDocRegistryClient);

  if (params.client) {
    await ensureDocRegistryCollection({
      registryCollectionName: params.registryCollectionName,
      client: params.client
    });
  } else {
    await ensureDocRegistryCollection({ registryCollectionName: params.registryCollectionName });
  }

  const pointId = getDocRegistryPointId(params.docId);

  const points = await client.retrieve(params.registryCollectionName, {
    ids: [pointId],
    with_payload: true,
    with_vector: false
  });

  if (!Array.isArray(points) || points.length === 0) return null;

  const first = points[0] as { payload?: unknown } | null;
  const payload = first?.payload ?? null;
  const parsed = parseRegistryPayload(payload);
  if (!parsed) return null;
  if (parsed.doc_id !== params.docId) return null;

  return parsed;
};

export const listDocRegistryEntries = async (params: {
  registryCollectionName: string;
  maxDocs: number;
  pageSize: number;
  client?: QdrantDocRegistryClient;
}): Promise<{ entries: DocRegistryEntry[]; scannedPoints: number }> => {
  if (params.maxDocs <= 0) throw new Error("maxDocs must be > 0");
  if (params.pageSize <= 0) throw new Error("pageSize must be > 0");

  const client = params.client ?? (qdrantClient as unknown as QdrantDocRegistryClient);

  if (params.client) {
    await ensureDocRegistryCollection({
      registryCollectionName: params.registryCollectionName,
      client: params.client
    });
  } else {
    await ensureDocRegistryCollection({ registryCollectionName: params.registryCollectionName });
  }

  const entryByDocId = new Map<string, DocRegistryEntry>();
  let scannedPoints = 0;
  let offset: unknown | null = null;

  while (entryByDocId.size < params.maxDocs) {
    const remaining = params.maxDocs - entryByDocId.size;
    const limit = Math.min(params.pageSize, remaining);

    const response = await client.scroll(params.registryCollectionName, {
      limit,
      offset: offset ?? undefined,
      with_payload: true,
      with_vector: false
    });

    const points = parseScrollPoints(response);
    const processed = points.slice(0, limit);
    if (processed.length === 0) break;

    for (const point of processed) {
      const payload = (point as { payload?: unknown } | null)?.payload ?? null;
      const parsed = parseRegistryPayload(payload);
      if (!parsed) continue;
      if (!entryByDocId.has(parsed.doc_id)) entryByDocId.set(parsed.doc_id, parsed);
    }

    scannedPoints += processed.length;

    const nextOffset = parseNextPageOffset(response);
    if (nextOffset === null) break;
    offset = nextOffset;
  }

  const entries = Array.from(entryByDocId.values()).sort((a, b) => a.doc_id.localeCompare(b.doc_id));
  return { entries, scannedPoints };
};

export type QdrantDocRegistryDeleteClient = {
  delete: (collectionName: string, params: unknown) => Promise<unknown>;
};

export const deleteDocRegistryEntry = async (params: {
  registryCollectionName: string;
  docId: string;
  client?: QdrantDocRegistryDeleteClient;
}): Promise<void> => {
  const client = params.client ?? (qdrantClient as unknown as QdrantDocRegistryDeleteClient);
  const pointId = getDocRegistryPointId(params.docId);
  await client.delete(params.registryCollectionName, { wait: true, points: [pointId] });
};
