# Agent Memory: UI Polish

Standing feedback for future `Agent: UI Polish` runs.

## Guidance

- Do not touch `server/sync-server.mjs` or payment sync logic — those belong to a different loop.
- Keep currency display in EGP; preserve the local-first room model.
- Known false-positive area: receipt parsing UI changes often conflict with receiptParser.js logic — coordinate with receipt parser before editing parser-related components.
