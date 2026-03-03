# OpenClaw DocOps Automation Agent

Production-grade document ingestion + grounded Q&A + audit harness, exposed via:
- CLI (ingest, ask, audit)
- HTTP API (automation-ready)
- OpenClaw skill (chat-native execution)

## What it does
- Ingest PDFs → chunk → embed (OpenAI) → store in Qdrant
- Ask questions → retrieve top chunks → answer with citations (or refusal)
- Run audits across presets → generate Markdown + JSON reports
- Emit webhook events for n8n/Make/Zapier

## Tech
- Node.js + TypeScript
- OpenAI API (embeddings + responses)
- Qdrant (vector DB)
- OpenClaw skill (chat interface)

## Requirements
- Node 20+
- A running Qdrant instance (Cloud or local)
- OpenAI API key

## Setup
1) Install:

    npm i

2) Configure env:

    cp .env.example .env

3) Run Qdrant (Cloud or local install) and set QDRANT_URL.

## Commands (coming as implementation lands)

    npm run ingest -- --pdf ./docs/sample.pdf --doc-id sample
    npm run ask -- --doc-id sample --q "What is this document about?"
    npm run audit -- --doc-id sample --set ./docs/eval/set.example.json

## Outputs
- tmp/audit-report.md
- tmp/audit-report.json

## Status
This repo is built as a portfolio-grade reference implementation focused on reliability, cost control, traceability, and automation-ready behavior.
