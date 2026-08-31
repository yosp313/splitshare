# Code Summary

Implemented the fresh SplitShare plan.

## Built

- Added optional InstaPay share-code persistence, participant propagation, validation, configured username links, legacy fallback, and exact room summaries.
- Added the welcome/profile editors, owner-code update flow, payment-link wiring, and separate summary-copy feedback.
- Added native SSE room events with initial snapshots, PUT broadcasts, heartbeats, cleanup, REST reconciliation, and explicit polling fallback.
- Extended payment, math, and sync assertion scripts.

## Files changed

- `src/lib/splitShareStore.js`
- `src/lib/syncApi.js`
- `server/sync-server.mjs`
- `src/App.jsx`
- `src/styles.css`
- `scripts/check-payment.mjs`
- `scripts/check-math.mjs`
- `scripts/check-sync.mjs`
- `scripts/check-friends.mjs`

## Verification

```text
node scripts/check-math.mjs
node scripts/check-receipt.mjs
node scripts/check-payment.mjs
npm run check:sync
npm run build
```

All passed. No plan deviations.
