Cursor Prompt

Confirm assumptions for retrieval debug feature.

1. Verify RetrieveRequestSchema exists in src/web/schemas.ts and is exported.
2. Verify src/web/server.ts route /v1/retrieve is registered and uses RetrieveRequestSchema.parse.
3. Verify retrieveSourcesForQuestion supports topK and minScore overrides.
4. Confirm formatRetrievedSources output is stable and include_text controls text.
5. Confirm no conflicts with existing ask/audit endpoints.

If any mismatch, provide minimal diff.
