Runbook

Common workflows

1. First-time bring-up

- npm ci
- cp .env.example .env
- npm run dev
- curl http://localhost:3000/health
- POST /v1/qdrant/check

2. Ingest a document

- npm run ingest -- --pdf <path> --doc-id <id>
- If re-ingesting intentionally, use --replace true
- To avoid re-ingest on unchanged content, use skip_unchanged true

3. Ask grounded questions

- npm run ask -- --doc-id <id> --q "<question>"
- Use trace mode to capture artifacts when debugging ask output

4. Debug retrieval

- npm run retrieve -- --doc-id <id> --q "<question>" --include-text true
- Tune TOP_K and MIN_SCORE in .env as needed

5. Audit

- npm run audit -- --doc-id <id> --set docs/eval/set.example.json
- Inspect tmp/audit-report.md and tmp/audit-report.json

6. Registry repair

- If registry is missing or stale:
  - npm run registry:rebuild -- --dry-run true
  - npm run registry:rebuild

7. Backup and restore registry

- Export
  - npm run registry:export
- Import
  - npm run registry:import -- --in <export.json> --dry-run true
  - npm run registry:import -- --in <export.json>

8. Ops checks

- npm run diagnostics
- npm run config:print
- npm run cache:cleanup -- --dry-run true

Failure triage

- If Qdrant errors: verify QDRANT_URL and QDRANT_API_KEY
- If OpenAI errors: verify OPENAI_API_KEY and timeouts
- If schema errors: check 400 response issues payload
