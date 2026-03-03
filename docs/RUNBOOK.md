# Runbook

## Requirements
- Node 20+
- Qdrant reachable at `QDRANT_URL` (Cloud or local)
- OpenAI API key in `OPENAI_API_KEY`

## Setup
1) Install deps:
   npm i

2) Configure env:
   cp .env.example .env

3) Verify Qdrant:
   - QDRANT_URL points to your cluster
   - QDRANT_API_KEY set if required

## Troubleshooting
- Qdrant connection errors: verify URL/API key + network allowlist (if any)
- OpenAI errors: verify key + model env vars
- Timeouts: increase REQUEST_TIMEOUT_MS
