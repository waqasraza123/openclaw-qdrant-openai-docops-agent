Cursor Prompt

We are adding a Qdrant-backed doc registry collection to store one record per doc_id for scalable doc listing and doc info. Please review these files:
- src/maintenance/docRegistry.ts
- scripts/ingest.ts
- scripts/doc-info.ts
- scripts/doc-registry-list.ts

Confirm TypeScript strict mode correctness (exactOptionalPropertyTypes, noUncheckedIndexedAccess). Confirm Qdrant client usage (createCollection, upsert, retrieve, scroll) is correct and payload parsing is safe. Point out any edge cases or missing validation without changing the feature scope.
