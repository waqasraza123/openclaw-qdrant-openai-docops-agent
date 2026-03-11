---
name: openclaw-docops
version: 1.0.0
description: Ingest PDFs, ask grounded questions with citations, run audits, and manage doc lifecycle in Qdrant.
---

Assumptions
This file follows the OpenClaw SKILL.md convention used by OpenClaw skill packs. If your OpenClaw version expects different frontmatter keys, adjust accordingly.

OpenClaw DocOps
Use this skill to run repo CLI commands that manage document ingestion, Qdrant storage, grounded Q and A, and audit reports.

Preconditions
A configured .env exists with OPENAI_API_KEY, QDRANT_URL, QDRANT_API_KEY.
Dependencies are installed with npm i.

Commands
Ingest a PDF
npm run ingest -- --pdf <pdf_path> --doc-id <doc_id>

Replace existing vectors for the same doc_id
npm run ingest -- --pdf <pdf_path> --doc-id <doc_id> --replace true

Ask a grounded question
npm run ask -- --doc-id <doc_id> --q "<question>"

Qdrant connectivity check
npm run qdrant:check

Doc stats
npm run doc:stats -- --doc-id <doc_id>

Delete a doc_id safely
npm run doc:delete -- --doc-id <doc_id> --confirm <doc_id>

Run an audit set
npm run audit -- --doc-id <doc_id> --set <eval_set_path>
