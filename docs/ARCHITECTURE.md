Architecture

High-level modules
- src/ingest: PDF extract, chunking, embeddings, storage
- src/retrieve: query embedding and Qdrant search
- src/answer: grounded prompt build and generation with guardrails
- src/eval: audit set runner, judging, report generation
- src/maintenance: registry, exports/imports, diagnostics, cache cleanup
- src/web: HTTP server, schemas, error handling

Data model
- Chunks are stored as points in Qdrant collection QDRANT_COLLECTION
- Each point payload includes doc_id, chunk_id, chunk_index, token_count, source, text, created_at
- Doc registry is stored in QDRANT_COLLECTION_registry with one point per doc_id

Operational design
- Deterministic identifiers for idempotent ingestion
- Strict schema validation at API boundaries
- Cost controls via batching, caching, and skip-unchanged ingestion
