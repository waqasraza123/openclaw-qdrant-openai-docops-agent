export type RerankableSource = {
  chunkId: string;
  score: number;
  text: string;
  source: string;
  chunkIndex: number;
};

const tokenize = (text: string) =>
  text
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);

const computeOverlapRatio = (question: string, candidateText: string) => {
  const questionTokens = tokenize(question);
  if (questionTokens.length === 0) return 0;

  const questionSet = new Set(questionTokens);
  const candidateSet = new Set(tokenize(candidateText));

  let overlapCount = 0;
  for (const token of questionSet) {
    if (candidateSet.has(token)) overlapCount += 1;
  }

  return overlapCount / questionSet.size;
};

export const rerankSourcesDeterministically = (params: {
  question: string;
  sources: RerankableSource[];
}): RerankableSource[] => {
  const decorated = params.sources.map((s) => ({
    source: s,
    overlapRatio: computeOverlapRatio(params.question, s.text)
  }));

  decorated.sort((a, b) => {
    if (b.overlapRatio !== a.overlapRatio) return b.overlapRatio - a.overlapRatio;
    if (b.source.score !== a.source.score) return b.source.score - a.source.score;
    if (a.source.chunkIndex !== b.source.chunkIndex) return a.source.chunkIndex - b.source.chunkIndex;
    return a.source.chunkId.localeCompare(b.source.chunkId);
  });

  return decorated.map((d) => d.source);
};
