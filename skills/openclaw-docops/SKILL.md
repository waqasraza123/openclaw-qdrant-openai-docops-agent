---
name: openclaw-docops
description: Ingest PDFs, ask grounded questions with citations, and run audits against Qdrant-backed docs.
version: 1.0.0
metadata:
  openclaw:
    requires:
      bins:
        - node
        - npm
    os:
      - darwin
      - linux
---

# OpenClaw DocOps

Use this skill to ingest a PDF into the DocOps service, ask grounded questions, run audits, and manage doc lifecycle.

## Preconditions

The repository is present on disk and dependencies are installed with npm i. A configured .env exists with OPENAI_API_KEY, QDRANT_URL, and QDRANT_API_KEY.

## Ingest a PDF

npm run ingest -- --pdf <pdf_path> --doc-id <doc_id>

Replace an existing doc_id

npm run ingest -- --pdf <pdf_path> --doc-id <doc_id> --replace true

## Ask a question

npm run ask -- --doc-id <doc_id> --q "<question>"

Return the JSON output exactly, preserving citations and refusal_reason.

## Doc stats

npm run doc:stats -- --doc-id <doc_id>

## Delete a doc_id safely

npm run doc:delete -- --doc-id <doc_id> --confirm <doc_id>

## Run an audit

npm run audit -- --doc-id <doc_id> --set <eval_set_path>

If tmp/audit-report.md exists, include its summary and provide the file path.
