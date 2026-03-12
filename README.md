OpenClaw DocOps Agent

Production-grade document ingestion + grounded Q&A + audit harness.
Node.js + TypeScript + OpenAI embeddings + Qdrant Cloud.

What this is
- Ingest PDFs into Qdrant with deterministic chunk ids and safe retry behavior
- Ask grounded questions with citations and refusal when context is insufficient
- Run audits that produce JSON + Markdown reports for evaluation and iteration
- Ops-grade tooling: registry, exports/imports, diagnostics, config snapshot, cache cleanup

Key features
- PDF ingestion pipeline: extract, chunk, embed, store
- Grounded answering: citations + refusal guardrails
- Audit runner: repeatable evaluation runs with artifacts
- Doc lifecycle ops:
  - doc registry (list/get + rebuild)
  - doc export (chunks) and registry export/import
  - doc delete removes both chunks and registry entry
- Debug tools:
  - retrieval debug endpoint and CLI
  - diagnostics CLI and API
  - redacted config snapshot CLI and API
  - cache cleanup CLI

Requirements
- Node from .nvmrc
- Qdrant Cloud cluster endpoint and API key
- OpenAI API key

Setup
1) Install dependencies
    npm ci

2) Configure environment
    cp .env.example .env
    Fill OPENAI_API_KEY, QDRANT_URL, QDRANT_API_KEY

3) Run server
    npm run dev

Health check
    curl http://localhost:3000/health

Core CLI commands
- Ingest
    npm run ingest -- --pdf ./docs/sample.pdf --doc-id sample

- Ask
    npm run ask -- --doc-id sample --q "What is this document about?"

- Retrieve debug
    npm run retrieve -- --doc-id sample --q "What topics are covered?" --include-text true

- Audit
    npm run audit -- --doc-id sample --set docs/eval/set.example.json

Doc and registry ops
- List docs by scanning chunks collection
    npm run doc:list

- Export doc chunks
    npm run doc:export -- --doc-id sample

- Registry list and get
    npm run doc:registry:list
    npm run doc:info -- --doc-id sample

- Registry rebuild (from chunks)
    npm run registry:rebuild -- --dry-run true

- Registry export and import
    npm run registry:export
    npm run registry:import -- --in tmp/registry/registry-export-*.json --dry-run true

Ops utilities
- Diagnostics
    npm run diagnostics

- Config snapshot (redacted)
    npm run config:print

- Cache cleanup
    npm run cache:cleanup -- --dry-run true

API endpoints
See docs/API.md for full request/response examples.

Production notes
- Uses Qdrant Cloud, no Docker required
- Strong schema validation at boundaries
- Timeouts, retries, rate limiting, concurrency caps
- Deterministic ids for ingestion safety
- Artifacts written under tmp/ for audits and ops exports

Docs
- docs/API.md
- docs/RUNBOOK.md
- docs/ARCHITECTURE.md
