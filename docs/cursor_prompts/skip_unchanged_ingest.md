Cursor Prompt

Confirm assumptions for skip unchanged ingestion feature.

1. Locate doc registry update logic.

- Verify registry is updated after successful ingestion in scripts/ingest.ts and src/web/server.ts handleIngest.
- Verify registry payload includes: content_hash, embed_model, chunk_max_tokens, chunk_overlap_tokens, chunk_count, created_at, updated_at.

2. Verify content hash source.

- Confirm content_hash is computed from extracted PDF text, not from file path or metadata.

3. Verify chunk_count correctness.

- Confirm chunk_count equals number of chunks successfully upserted for the doc_id.

4. Verify skip flag behavior.

- Confirm scripts/ingest.ts parses --skip-unchanged true and does not skip when --replace true.
- Confirm src/web/schemas.ts includes skip_unchanged with default false and src/web/server.ts uses parsed.skip_unchanged.
- Confirm skip decision happens before embedding and upsert.

5. Identify any ingestion path that bypasses registry.

- If found, propose minimal safe fix.

Return a minimal diff if any assumption is violated.
