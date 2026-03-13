# OpenClaw DocOps Agent

Production-grade document ingestion, grounded Q&A, and audit tooling built with Node.js, TypeScript, OpenAI embeddings, and Qdrant Cloud.

## What this is

OpenClaw DocOps Agent ingests PDF documents into Qdrant, retrieves grounded context for question answering, and provides audit and operational tooling for debugging, maintenance, and evaluation.

It is designed as a portfolio-grade reference implementation focused on reliability, traceability, and safe iteration.

## What it does

- Ingest PDFs into Qdrant
- Split extracted text into deterministic chunks
- Generate embeddings with OpenAI
- Store chunk vectors and metadata in Qdrant
- Answer grounded questions with citations
- Refuse when the retrieved context is insufficient
- Run repeatable audits with JSON and Markdown artifacts
- Provide document lifecycle and registry tooling for maintenance

## Key features

- PDF ingestion pipeline: extract, chunk, embed, store
- Grounded answering with citation validation and refusal guardrails
- Audit runner with repeatable evaluation outputs
- Document lifecycle operations:
  - document registry list and get
  - registry rebuild from stored chunks
  - chunk export and registry export/import
  - document delete removes both chunks and registry entry
- Debug and ops tooling:
  - retrieval debug CLI and API
  - diagnostics CLI and API
  - redacted config snapshot CLI and API
  - cache cleanup CLI

## Architecture summary

The system uses two Qdrant collections:

- docs_chunks
  - stores embedded document chunks
  - vector size must match the embedding model
  - current default embedding model uses vector size 1536

- docs_chunks_registry
  - stores document registry metadata
  - uses a placeholder vector
  - vector size must be 1

Chunk and registry payloads preserve stable business identifiers such as doc_id and chunk_id.

Qdrant point ids are written as deterministic UUIDs derived from internal ids so they stay valid for Qdrant while remaining stable across retries and re-runs.

## Requirements

- Node version from .nvmrc
- Qdrant Cloud cluster endpoint and Database API key
- OpenAI API key

## Qdrant setup

Create these collections in Qdrant Cloud before running ingestion:

### docs_chunks

- vector size: 1536
- distance: Cosine

### docs_chunks_registry

- vector size: 1
- distance: Cosine

If you use a restricted Qdrant API key, make sure it has access to both collections.

## Setup

1. Install dependencies

npm ci

2. Configure environment

cp .env.example .env

Fill these required values:

- OPENAI_API_KEY
- QDRANT_URL
- QDRANT_API_KEY

3. Run the server

npm run dev

## Health check

curl http://localhost:3000/health

## Core CLI commands

### Ingest

npm run ingest -- --pdf ./docs/sample.pdf --doc-id sample

### Ask

npm run ask -- --doc-id sample --q "What is this document about?"

### Retrieve debug

npm run retrieve -- --doc-id sample --q "What topics are covered?" --include-text true

### Audit

npm run audit -- --doc-id sample --set docs/eval/set.example.json

## Document and registry operations

### List docs by scanning the chunks collection

npm run doc:list

### Export document chunks

npm run doc:export -- --doc-id sample

### Registry list and get

npm run doc:registry:list
npm run doc:info -- --doc-id sample

### Registry rebuild from stored chunks

npm run registry:rebuild -- --dry-run true

### Registry export and import

npm run registry:export
npm run registry:import -- --in "tmp/registry/registry-export-*.json" --dry-run true

## Ops utilities

### Diagnostics

npm run diagnostics

### Redacted config snapshot

npm run config:print

### Cache cleanup

npm run cache:cleanup -- --dry-run true

## API

See docs/API.md for request and response examples.

## Production notes

- Uses Qdrant Cloud, no Docker required
- Strong schema validation at boundaries
- Deterministic ids improve ingestion safety and retry behavior
- Qdrant point ids are UUID-based and payload ids remain stable and readable
- Artifacts are written under tmp/ for audits and operational exports
- Registry metadata is stored separately from embedded chunks
- Collection configuration must match application expectations:
  - docs_chunks = embedding vector size
  - docs_chunks_registry = 1

## Docs

- docs/API.md
- docs/RUNBOOK.md
- docs/ARCHITECTURE.md
