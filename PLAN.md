# SplitShare Feature Plan

## Overview

Build these three changes as one sync-layer and room-view pass:

1. Store an optional `instapayShareCode` on each local profile and participant snapshot, expose it in the create/edit profile UI, and use the room owner’s value when a username must be turned into an InstaPay link.
2. Add a pure room-summary formatter and a room-view `Copy summary` action that copies participant names and current calculated EGP shares as plain text.
3. Replace the two-second room polling interval with native Server-Sent Events (SSE), while retaining REST for initial reconciliation, writes, reconnect fallback, and create/join flows.

The split math, receipt parsing, settlement states, localStorage room cache, Vite host binding, and `VITE_API_BASE` behavior remain unchanged.

### Acceptance criteria

- A profile can save an optional share code. New rooms and edited participants carry it forward; old profiles and rooms without it still work with the legacy `23bZwC` fallback.
- The paid-by-host link uses the owner’s participant share code when the owner value is a username. A complete `https://ipn.eg/...` link remains unchanged.
- `Copy summary` produces deterministic text in participant order, including the current room code and calculated shares, with no app URL or payment link required.
- A room client opens one SSE channel while the room is active, receives updates after another client’s successful room update, closes the channel on exit, and does not run the old two-second polling interval.
- If SSE is unavailable, the REST GET still hydrates the room and is retried on SSE errors; room writes continue through the existing PUT queue.
- `check-math`, `check-receipt`, `check-payment`, `check:sync`, and `npm run build` pass.

## Current-state evidence

Inspected directly:

- `src/lib/splitShareStore.js`: profile/participant construction, localStorage normalization, hardcoded InstaPay fallback, and share calculation.
- `src/App.jsx`: welcome profile form, room sidebar payment link, invite copy action, room update queue, and the `setInterval(pullRoom, 2000)` lifecycle.
- `src/lib/syncApi.js`: REST URL construction from `VITE_API_BASE` and room CRUD calls.
- `server/sync-server.mjs`: one-process Node `http` server, SQLite room state, and PUT persistence boundary.
- `scripts/check-math.mjs`, `scripts/check-payment.mjs`, `scripts/check-sync.mjs`, and `scripts/check-receipt.mjs`: current deterministic verification style.
- `package.json` and `vite.config.js`: no realtime dependency, Node `>=22.5.0`, `/api` proxy, `0.0.0.0` host binding, and existing allowed hosts.

No `ANSWERS.md` exists. Existing planning/design files were intentionally not used because the request says they may belong to unrelated work.

### External evidence and alternatives

Observed 2026-08-31:

- [MDN: Using server-sent events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events) establishes that browser `EventSource` is a native one-way stream with automatic reconnect, `text/event-stream` framing, named events, and an explicit `.close()` method. It also notes the browser connection limit and the need for keep-alive comments.
- [Node.js HTTP documentation](https://nodejs.org/api/http.html) establishes that the existing `ServerResponse` supports repeated `write()` calls and `flushHeaders()`, which is sufficient for a dependency-free SSE endpoint.
- [Socket.IO documentation](https://socket.io/docs/v4/) is the main heavier alternative: it adds bidirectional messaging, heartbeats, buffering, reconnect backoff, and transport fallback, but also adds a protocol and dependency that this one-way room-update channel does not need.
- [Supabase Realtime Broadcast documentation](https://supabase.com/docs/guides/realtime/broadcast) is the managed-service alternative: it provides low-latency channel broadcast and scaling/authorization primitives, but violates the existing Node + SQLite/local-first constraint and introduces vendor/runtime configuration.

Recommendation: native SSE. It fits the existing stack, needs no package or lockfile change, and client-to-server actions already use REST. The recommendation becomes wrong if the server is deployed across multiple processes/instances, room traffic grows materially, authentication is added to the stream, or the app needs client-to-client messages, presence, or offline event replay; then use a broker-backed realtime service or a WebSocket/SSE gateway.

## Architecture and data model

### Profile and participant records

Keep the current profile object and add one optional string:

```text
profile = {
  id?, name, instapayLink, instapayShareCode?, emoji
}
```

`makeParticipant()` copies `instapayShareCode` into the participant snapshot. `normalizeParticipant()` and `getStoredState()` normalize a missing value to `''` without changing existing fields. The room owner’s participant is the source used by the room payment button, because the room is what other devices receive.

The existing local `friends` record does not need a new field for this feature. If a friend object is passed into `joinRoom`, the participant constructor may accept a supplied code, but friend CRUD/UI remains out of scope.

Profile editing must update both local state and the matching participant in the active room. Preserve the participant ID and `ownerId`; update only editable profile fields and derived display fields. Queue the updated room through the existing PUT path so other clients receive the changed owner code.

### InstaPay link contract

Change the pure helper to:

```text
buildInstapayLink(linkOrUsername, instapayShareCode = legacy fallback)
```

Behavior:

- Trim both inputs.
- Return a complete `https://ipn.eg/...` value unchanged, preserving current behavior.
- Otherwise build `https://ipn.eg/S/<encoded username>/instapay/<encoded share code>`.
- Use `23bZwC` only when the profile has no share code, explicitly as a backwards-compatibility fallback.
- Keep the input bounded by the existing UI length limit and encode path segments. Do not invent a stricter InstaPay code format without a product/API source.

The profile create/edit field should be labeled as an InstaPay link or username so the already-supported helper fallback is reachable from the UI. A full link remains accepted; a non-empty username is accepted for this profile field. Existing saved-friend validation can remain full-link-only because it is unrelated to the requested per-profile setting.

### Summary contract

Add a pure helper in `src/lib/splitShareStore.js`:

```text
buildSplitSummary(room) -> string
```

It calls the existing `calculateShares(room.receipt, participantIds)` and returns:

```text
SplitShare — Room ABC123
Mina — EGP 189.71
Omar — EGP 142.29
```

Use current participant order and `amount.toFixed(2)`. A missing receipt naturally yields the calculator’s current zero amounts; do not add a second calculation or receipt-total rule.

### SSE protocol

Add this endpoint without changing SQLite schema:

```text
GET /api/rooms/:code/events
Content-Type: text/event-stream; charset=utf-8
Cache-Control: no-cache
Connection: keep-alive

event: room.updated
data: {"room": { ...full room state... }}

```

Server behavior:

- Validate and look up the room before opening the stream; return the existing JSON 404 for an unknown room.
- Maintain `Map<roomCode, Set<ServerResponse>>` inside `createSyncServer()`.
- Send the current room once when a stream connects, then retain the response.
- After a successful SQLite `PUT`, broadcast the persisted full room to every current listener for that code, including the writer. Broadcast only after the database update succeeds.
- Send an SSE comment heartbeat approximately every 15 seconds to prevent idle proxy/socket timeouts.
- Remove a response on its `close` event; `close()` must clear the heartbeat, end active streams, and close the database.
- Keep the current permissive CORS headers on the stream so both the Vite proxy and an absolute `VITE_API_BASE` work.

Known ceiling: listeners are process-local and updates are last-write-wins because the existing API sends full room snapshots. Mark this deliberately in the server with a `ponytail:` comment naming the upgrade path (shared broker/versioned patch protocol) if the Coder adds the implementation comment.

## Components and interfaces

### `src/lib/splitShareStore.js`

- Extend `makeParticipant()` and participant normalization with `instapayShareCode`.
- Keep a clearly named legacy fallback constant local to `buildInstapayLink()`.
- Change `buildInstapayLink()` to accept the owner code.
- Add `buildSplitSummary(room)` using `calculateShares()`.
- Add the smallest profile/participant update helper only if it avoids duplicating the mapping logic in `App.jsx`; otherwise update the matching participant inline. Do not refactor receipt or settlement code.

### `src/lib/syncApi.js`

Add a URL builder and subscription wrapper that use the exact existing `API_BASE` normalization:

```text
getRoomEventsUrl(code) -> string
subscribeToRoom(code, onRoom, onError?) -> () => void
```

The wrapper creates native `EventSource`, listens for `room.updated`, parses the JSON envelope, invokes `onRoom(room)`, and returns an idempotent cleanup function. It should expose connection errors to `App` and not add a dependency or custom transport.

### `src/App.jsx`

- Add `instapayShareCode` to the welcome form initialization, create profile payload, join profile payload, logout reset, and profile editor.
- Add a small accessible profile editor toggled from the room header/avatar area. Reuse the existing form/button/emoji styling language; do not introduce a modal library. On save, persist the profile locally and update the matching room participant, then use `updateRoom()` for remote sync. Validate name and profile payment value at the same trust boundary as create; show a non-blocking hint when the code is empty and the legacy fallback will be used.
- Change the sidebar payment link call to pass the owner participant’s `instapayShareCode`.
- Add separate summary-copy state from the existing invite-copy state. Copy `buildSplitSummary(room)` with `navigator.clipboard.writeText`, announce success/failure, and keep the action near the invite card/header. It must not include an InstaPay URL.
- Replace only the room subscription effect: subscribe to SSE when `state.room?.code` exists, perform a REST GET reconciliation on entry, apply pushed rooms to `stateRef`, React state, and localStorage, and close the stream on cleanup/leave.
- Preserve the dirty-room guard: do not apply incoming events while a local room snapshot is waiting in the existing PUT queue. Clear the guard only after the PUT succeeds. On SSE error, surface the existing sync error and perform a one-shot REST pull; rely on native EventSource reconnect rather than restoring a fixed polling interval.
- Keep `queueRemoteRoom()`, its serialization, retry behavior, and all create/join/update handlers intact except for the new profile fields and subscription wiring.

### `server/sync-server.mjs`

- Add stream bookkeeping and a small SSE writer/broadcast helper inside `createSyncServer()`.
- Route `/api/rooms/:code/events` before the current exact room route.
- Broadcast from the existing PUT branch after `replaceRoom.run()` succeeds.
- Preserve POST/GET/PUT validation and JSON response shapes.

### `src/styles.css`

Add only the selectors needed for the profile editor, summary action/status, and any mobile wrapping. Reuse `.friend-form`, `.button`, `.button-quiet`, `.section-kicker`, and existing focus-visible rules where possible. Check desktop and 320–560px layouts; do not alter receipt/editor layout rules unnecessarily.

## Build order

### Phase 1 — Domain contracts and regression assertions

1. Add optional share-code normalization and the two pure helpers in `splitShareStore.js`.
2. Update `check-payment.mjs` for custom-code username links, full-link passthrough, legacy fallback, and profile/participant persistence.
3. Add an exact summary assertion to `check-math.mjs` using the existing 332 EGP fixture.

Verify: `node scripts/check-payment.mjs` and `node scripts/check-math.mjs`.

### Phase 2 — Profile UI and payment-link wiring

1. Add the share-code field to the welcome create/join profile state and payloads.
2. Add the compact room profile editor and save flow, including localStorage and active-room participant update.
3. Pass the owner participant’s code into `buildInstapayLink()`.
4. Add the minimal CSS and keyboard/focus labels.

Verify: inspect the create, join, edit, and legacy-profile paths at desktop and mobile widths; confirm no receipt/settlement code changed.

### Phase 3 — Copy summary

1. Add the room-view action beside the invite controls.
2. Use the pure formatter and current `RoomView` room state; keep invite and summary feedback independent.

Verify: the copied text exactly matches the current participant order and calculated amounts; confirm it contains no URL.

### Phase 4 — SSE server and sync API

1. Add the `/events` route and connection cleanup.
2. Send initial snapshot, update events, and heartbeat comments.
3. Broadcast only after successful PUT persistence.
4. Add `getRoomEventsUrl()` and `subscribeToRoom()` using `VITE_API_BASE` rules.

Verify: `scripts/check-sync.mjs` connects to a temporary server, checks SSE headers and initial event, performs a PUT, reads the pushed updated room event, then aborts/cleans up.

### Phase 5 — Client subscription replacement

1. Remove the `setInterval` polling effect.
2. Open/close the SSE subscription with room lifecycle.
3. Reconcile with REST on entry and on stream errors; apply pushed snapshots through the existing local-first state path.
4. Confirm local dirty writes cannot be overwritten by an in-flight remote event and that retries still work.

Verify: run the sync regression and manually exercise two browser tabs against the same room: participant join, receipt edit, item assignment, payment status, profile code edit, and room leave.

### Phase 6 — Full verification and handoff

Run:

```text
node scripts/check-math.mjs
node scripts/check-receipt.mjs
node scripts/check-payment.mjs
npm run check:sync
npm run build
```

Also run `node scripts/check-friends.mjs` if friend normalization was touched. Confirm `git diff` contains only the requested feature files/checks and no changes to `vite.config.js`, receipt math, parser behavior, or settlement logic.

## Risks and mitigations

- **Single-process SSE state:** listeners disappear on restart and do not cross multiple server instances. REST reconciliation and browser reconnect recover local clients; move to a shared broker only when deployment scales beyond one process.
- **Idle proxy buffering/timeouts:** send comment heartbeats and set SSE cache/buffering headers. Validate through the phone-access setup, not only localhost.
- **Concurrent full-room PUTs:** SSE does not solve the existing last-write-wins model. Preserve current queue/dirty behavior and do not introduce optimistic merge logic in this feature.
- **SSE race with local edits:** ignore pushed snapshots while the current local snapshot is dirty; accept the server snapshot after the PUT resolves.
- **Legacy data:** normalize absent codes to empty strings and retain the old default only for username-to-link conversion. Complete old links continue to bypass the fallback.
- **Clipboard permissions:** use the native Clipboard API in its supported secure/local contexts and provide an accessible failure status; do not add a clipboard dependency.
- **Public room data:** SSE exposes the same room payload already available from unauthenticated GET/PUT endpoints. Authentication/authorization is not part of this scope and should be addressed before production-sensitive deployment.

## Assumptions and open-questions summary

- “Profile/edit-screen” is assumed to mean a compact editor reachable from the active room header; no existing profile screen was found.
- The InstaPay code is treated as an opaque, user-entered path segment; it is optional and URL-encoded rather than validated against an undocumented format.
- Summary format is intentionally limited to room code, participant names, and amounts; no merchant, receipt item detail, payment links, or app URL is added.
- Native SSE is sufficient for current single-process local SQLite deployment; WebSocket/managed realtime is deferred until scale or bidirectional presence requires it.
- No blocking questions remain, so `OPEN_QUESTIONS.md` is intentionally not created.
