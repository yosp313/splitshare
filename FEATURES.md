Splitshare feature work: build three enhancements together.

## Feature 1 — Configurable InstaPay share code per user
Right now `src/lib/splitShareStore.js` hardcodes `INSTAPAY_SHARE_CODE = '23bZwC'` and `buildInstapayLink()` falls back to that code when the user only supplies a username. Replace the hardcoded code with a per-profile configurable share code:
- Add `instapayShareCode` to the profile (store + UI).
- Let the user set it in their profile/edit-screen.
- When building the InstaPay link for a paid-by-host button, use the owner's actual share code instead of the hardcoded one.
- Keep backward compatibility: if a profile has no share code yet, keep behaving as today (or prompt the user to set one).

## Feature 3 — Share the split summary as text
Add a "Copy summary" action on the room view that produces a plain-text breakdown the user can paste into WhatsApp/chat, for people who aren't all in the app. Something like:
```
SplitShare — Room ABC123
Mina — EGP 189.71
Omar — EGP 142.29
```
- Should reflect the current room, receipt, participants, and their calculated shares.
- Should not require the person pasting it to have the app or the InstaPay link.
- Accessible from the room view (e.g. near the invite code or header).

## Feature 10 — Real-time sync instead of polling
Today the app polls `GET /api/rooms/<code>` every 2 seconds via `setInterval` in `App.jsx`. Replace that with a real-time channel so participants see each other's changes immediately:
- Server: add an SSE endpoint (or WebSocket) that pushes room updates when the room changes.
- Client: open the channel when in a room; reconcile with the REST GET on connect; use the pushed updates to update local state; keep the REST API as a fallback.
- Keep localStorage as the cache; keep the existing create/join/update flows working.
- The change is scoped to the sync layer; do not change receipt math, split calcs, or settlement logic.

## Constraints
- Stay on the existing React + Vite + Node sync server stack.
- Use existing design language and component style.
- Do not break the phone-access setup already in place (Vite host binding, VITE_API_BASE env).
- Verify with the existing check scripts (`check-math`, `check-receipt`, `check-payment`) plus a deterministic regression check for the new sync path.
