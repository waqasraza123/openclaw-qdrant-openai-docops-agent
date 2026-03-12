Feature Notes

Doc registry
- Adds a dedicated registry collection in Qdrant that stores one entry per doc_id.
- Improves scalability for doc discovery: list docs without scanning the entire vector collection.
- Provides doc lifecycle visibility: content_hash, chunk_count, page_count, ingest params, timestamps.

Direction check
- Consistent with the existing architecture: additive, Qdrant-backed metadata, no behavior changes to ingestion vectors or grounded answering.
- Not conflicting with existing features: doc stats/delete/chunk get/audit/export still work and remain source-of-truth for chunks.
- For very large installs, registry can become authoritative for doc listing and can power dashboards and automation triggers.

Doc delete also deletes registry entry
- When deleting a doc_id, the corresponding registry entry is removed to avoid stale registry reads.

Redacted config snapshot
- Adds config print CLI and a config snapshot API endpoint that redacts secrets for safe debugging.

Registry export
- Adds a CLI to export doc registry entries to a JSON artifact for backup and migrations.
