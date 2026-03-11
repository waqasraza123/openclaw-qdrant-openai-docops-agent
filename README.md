# OpenClaw DocOps Automation Agent

Production-grade document ingestion + grounded Q&A + audit harness.

Interfaces:
- CLI: ingest, ask, audit
- HTTP API: /v1/ingest, /v1/ask, /v1/audit/run
- OpenClaw skill integration can be added as a thin wrapper (skills folder)

## What it does
- Ingest PDFs -> chunk -> embed (OpenAI) -> store in Qdrant
- Ask questions -> retrieve chunks -> grounded answer with citations or refusal
- Audit an eval set -> JSON + Markdown report for reproducible evaluation

## Requirements
- Node 20+
- Qdrant Cloud cluster (QDRANT_URL + QDRANT_API_KEY)
- OpenAI API key

## Setup
1) Install
npm i

2) Configure env
cp .env.example .env

3) Ensure Qdrant Cloud is reachable
Set QDRANT_URL to your cluster endpoint and QDRANT_API_KEY to your key.

## Commands
Ingest:
npm run ingest -- --pdf ./docs/sample.pdf --doc-id sample

Ask:
npm run ask -- --doc-id sample --q "What is this document about?"

Audit:
npm run audit -- --doc-id sample --set ./docs/eval/set.example.json

Server:
npm run dev

## Outputs
- tmp/audit-report.json
- tmp/audit-report.md
