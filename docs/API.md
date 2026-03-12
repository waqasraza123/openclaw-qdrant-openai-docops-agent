API Reference

Base URL

- http://localhost:3000

Health

- GET /health

Qdrant connectivity

- POST /v1/qdrant/check

Ingest

- POST /v1/ingest
  Body
  - doc_id: string
  - pdf_path: string
  - replace: boolean optional, default false
  - skip_unchanged: boolean optional, default false

Ask

- POST /v1/ask
  Body
  - doc_id: string
  - question: string
  - trace: boolean optional, default false
    Returns
  - output, sources, timings
  - trace_path when trace is true

Retrieve debug

- POST /v1/retrieve
  Body
  - doc_id: string
  - question: string
  - top_k: number optional
  - min_score: number optional
  - include_text: boolean optional, default false

Audit

- POST /v1/audit/run
  Body
  - doc_id: string
  - eval_set_path: string

Docs operations

- POST /v1/docs/list
- POST /v1/docs/stats
- POST /v1/docs/export
- POST /v1/docs/delete
- POST /v1/chunks/get

Registry operations

- POST /v1/registry/get
- POST /v1/registry/list

Diagnostics

- POST /v1/diagnostics/run
  Body
  - include_openai: boolean optional, default false
    Returns 200 when ok, 503 when any included check fails

Config snapshot

- POST /v1/config/snapshot
  Returns redacted runtime config
