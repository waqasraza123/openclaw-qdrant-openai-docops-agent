Feature Notes

Doc registry
- Adds a dedicated registry collection in Qdrant that stores one entry per doc_id.
- Improves scalability for doc discovery: list docs without scanning the entire vector collection.
- Provides doc lifecycle visibility: content_hash, chunk_count, page_count, ingest params, timestamps.

Direction check
- Consistent with the existing architecture: additive, Qdrant-backed metadata, no behavior changes to ingestion vectors or grounded answering.
- Not conflicting with existing features: doc stats/delete/chunk get/audit/export still work and remain source-of-truth for chunks.
- For very large installs, registry can become authoritative for doc listing and can power dashboards and automation triggers.
