Assumptions
- Qdrant payload fields exist for stored chunks: doc_id, chunk_id, chunk_index, token_count, source, text, created_at
- Qdrant point id equals chunk_id (sha256 hex)
- Search results include score and payload fields listed above
- RE_RANK toggles deterministic reranking only after Qdrant similarity search
