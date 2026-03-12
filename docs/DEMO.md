# Demo Script (2–3 min Loom)

1. Open README (explain: ingest → grounded Q&A → audit reports → OpenClaw skill)
2. Run ingest:
   npm run ingest -- --pdf ./docs/sample.pdf --doc-id sample
3. Ask (shows citations):
   npm run ask -- --doc-id sample --q "What is this document about?"
4. Ask an out-of-scope question (shows refusal)
5. Run audit:
   npm run audit -- --doc-id sample --set ./docs/eval/set.example.json
6. Open tmp/audit-report.md and show summary + failures
