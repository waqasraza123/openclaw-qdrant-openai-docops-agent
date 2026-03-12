import { qdrantClient } from "../core/qdrant.js";

export type QdrantDocListClient = {
  scroll: (collectionName: string, params: unknown) => Promise<unknown>;
};

const parsePayloadString = (payload: unknown, key: string) => {
  const record = payload as Record<string, unknown> | null;
  const value = record ? record[key] : undefined;
  return typeof value === "string" ? value : null;
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

export const listDocIdsInCollection = async (params: {
  collectionName: string;
  maxPointsToScan: number;
  pageSize: number;
  client?: QdrantDocListClient;
}): Promise<{ docIds: string[]; scannedPoints: number }> => {
  if (params.maxPointsToScan <= 0) throw new Error("maxPointsToScan must be > 0");
  if (params.pageSize <= 0) throw new Error("pageSize must be > 0");

  const client = params.client ?? (qdrantClient as unknown as QdrantDocListClient);

  const docIdSet = new Set<string>();
  let scannedPoints = 0;
  let offset: unknown | null = null;

  while (scannedPoints < params.maxPointsToScan) {
    const remaining = params.maxPointsToScan - scannedPoints;
    const limit = Math.min(params.pageSize, remaining);

    const response = await client.scroll(params.collectionName, {
      limit,
      offset: offset ?? undefined,
      with_payload: ["doc_id"],
      with_vector: false
    });

    const points = parseScrollPoints(response);
    const processedPoints = points.slice(0, limit);
    if (processedPoints.length === 0) break;

    for (const point of processedPoints) {
      const payload = (point as { payload?: unknown } | null)?.payload ?? null;
      const docId = parsePayloadString(payload, "doc_id");
      if (docId) docIdSet.add(docId);
    }

    scannedPoints += processedPoints.length;

    const nextOffset = parseNextPageOffset(response);
    if (nextOffset === null) break;
    offset = nextOffset;
  }

  return { docIds: Array.from(docIdSet).sort((a, b) => a.localeCompare(b)), scannedPoints };
};
