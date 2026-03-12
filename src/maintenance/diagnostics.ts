export type DiagnosticsResult = {
  ok: boolean;
  started_at: string;
  finished_at: string;
  qdrant: {
    ok: boolean;
    latency_ms: number;
    collections: string[];
    error: string | null;
  };
  openai_embeddings: {
    included: boolean;
    ok: boolean;
    latency_ms: number;
    model: string;
    vector_size: number | null;
    error: string | null;
  };
};

export type DiagnosticsDependencies = {
  startedAtIso: string;
  nowIso: () => string;
  measureMs: <T>(operation: () => Promise<T>) => Promise<{ result: T; elapsedMs: number }>;
  getQdrantCollections: () => Promise<unknown>;
  createEmbeddings: (inputs: string[]) => Promise<{ vectors: number[][] }>;
  embedModel: string;
  probeText: string;
  includeOpenAi: boolean;
};

const stringifyError = (error: unknown) => {
  if (error instanceof Error) return error.message;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
};

const parseCollectionNames = (collectionsResponse: unknown) => {
  const record = collectionsResponse as Record<string, unknown> | null;
  const collections = record ? record["collections"] : undefined;
  if (!Array.isArray(collections)) return [];

  const names: string[] = [];
  for (const item of collections) {
    const itemRecord = item as Record<string, unknown> | null;
    const nameValue = itemRecord ? itemRecord["name"] : undefined;
    if (typeof nameValue === "string" && nameValue.trim().length > 0) names.push(nameValue);
  }

  return names.sort((a, b) => a.localeCompare(b));
};

const validateEmbeddingsResponse = (vectors: number[][]) => {
  if (!Array.isArray(vectors) || vectors.length === 0) {
    throw new Error("Embeddings response missing vectors");
  }
  const first = vectors[0];
  if (!Array.isArray(first) || first.length === 0) {
    throw new Error("Embeddings response has empty vector");
  }
  for (const value of first) {
    if (typeof value !== "number") {
      throw new Error("Embeddings response vector contains non-number values");
    }
  }
  return first.length;
};

export const runDiagnostics = async (deps: DiagnosticsDependencies): Promise<DiagnosticsResult> => {
  const qdrantBase = { ok: false, latency_ms: 0, collections: [] as string[], error: null as string | null };
  const openaiBase = {
    included: deps.includeOpenAi,
    ok: false,
    latency_ms: 0,
    model: deps.embedModel,
    vector_size: null as number | null,
    error: null as string | null
  };

  let qdrant = qdrantBase;
  try {
    const measured = await deps.measureMs(async () => await deps.getQdrantCollections());
    qdrant = {
      ok: true,
      latency_ms: measured.elapsedMs,
      collections: parseCollectionNames(measured.result),
      error: null
    };
  } catch (error) {
    qdrant = { ...qdrantBase, ok: false, error: stringifyError(error) };
  }

  let openai = openaiBase;
  if (!deps.includeOpenAi) {
    openai = { ...openaiBase, included: false, ok: true, latency_ms: 0, vector_size: null, error: null };
  } else {
    try {
      const measured = await deps.measureMs(async () => await deps.createEmbeddings([deps.probeText]));
      const vectorSize = validateEmbeddingsResponse(measured.result.vectors);
      openai = {
        included: true,
        ok: true,
        latency_ms: measured.elapsedMs,
        model: deps.embedModel,
        vector_size: vectorSize,
        error: null
      };
    } catch (error) {
      openai = { ...openaiBase, included: true, ok: false, error: stringifyError(error) };
    }
  }

  const finishedAtIso = deps.nowIso();
  const ok = qdrant.ok && openai.ok;

  return {
    ok,
    started_at: deps.startedAtIso,
    finished_at: finishedAtIso,
    qdrant,
    openai_embeddings: openai
  };
};
