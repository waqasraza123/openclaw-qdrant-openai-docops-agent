# OpenClaw DocOps Skill

This skill wraps the repository CLI commands so you can ingest, ask, audit, and manage doc lifecycle from OpenClaw.

## Requirements
- node and npm on PATH
- repository checked out locally
- .env configured with Qdrant Cloud and OpenAI keys

## Commands
- ingest: npm run ingest -- --pdf <pdf_path> --doc-id <doc_id>
- ask: npm run ask -- --doc-id <doc_id> --q "<question>"
- audit: npm run audit -- --doc-id <doc_id> --set <eval_set_path>
- doc stats: npm run doc:stats -- --doc-id <doc_id>
- doc delete: npm run doc:delete -- --doc-id <doc_id> --confirm <doc_id>
