# SplitShare: Share Codes, Text Summaries, and Real-Time Sync

## Overview

Build the three requested enhancements in the existing React + Vite + Node/SQLite application:

1. Store an optional InstaPay share code on the local profile and the corresponding room participant. Use the owner participant's code when a username must be turned into a payment link.
2. Add a room-view `Copy summary` action that copies the current participant shares as plain text.
3. Replace the normal two-second room poll with server-sent events (SSE), while retaining REST reads for initial reconciliation and fallback and retaining the current optimistic PUT queue.

The room object, receipt parser, share calculation, settlement states, SQLite table, Vite host binding, and `VITE_API_BASE` behavior remain otherwise unchanged.

## Acceptance criteria

- A profile can save an `instapayShareCode`; it survives localStorage reload and is copied into a newly created or joined participant.
- A legacy profile/participant without a share code still works. Full `https://ipn.eg/...` links pass through unchanged; username-based links use the legacy `23bZwC` fallback when no configured code exists.
- A host code edit updates the owner participant in the active room and is sent through the existing room PUT flow, so other clients use the new code.
- `Copy summary` copies a deterministic plain-text block containing the room code, every current participant, and that participant's current calculated amount. It does not include an app URL or require InstaPay.
- A connected room receives another client's room update without waiting for a normal poll interval.
- Opening the real-time channel performs a REST reconciliation; SSE failure or lack of `EventSource` leaves the app usable through REST fallback.
- Existing create, join, room update, localStorage, payment, parser, and receipt math flows continue to work.
- Verification passes:

  ```text
  node scripts/check-math.mjs
  node scripts/check-receipt.mjs
  node scripts/check-payment.mjs
  npm run check:sync
  npm run build
  ```

## Current architecture and seams

- `src/lib/splitShareStore.js` owns localStorage state, profile/participant construction and normalization, InstaPay link construction, receipt math, and settlement transitions.
- `src/App.jsx` owns the React state, optimistic local updates, the serialized remote PUT queue/retry, create/join flows, and the current `setInterval` GET poll. `RoomSidebar` owns the invite, participant, payment, and local-friends controls.
- `src/lib/syncApi.js` is the existing `VITE_API_BASE`-aware REST transport seam.
- `server/sync-server.mjs` stores each room as JSON in SQLite and handles POST/GET/PUT through one Node HTTP server. The PUT handler is the single place where a changed room is persisted and can be broadcast.
- `scripts/check-payment.mjs`, `scripts/check-math.mjs`, and `scripts/check-sync.mjs` already provide small deterministic assertion checks and should be extended rather than adding a test framework.
- No profile route or profile editor currently exists. The requested profile/edit-screen is therefore interpreted as a compact editor opened from the active-room header/avatar, with the same optional field also available in the welcome create/join form so a user can configure it before creating a room.

## Architecture

### 1. Profile and InstaPay share code

Add `instapayShareCode` as an optional string to the local profile. Normalize missing legacy values to an empty string in memory; do not write the old hardcoded value into new profiles.

Pass the same field through `makeParticipant`, `createRoom`, and `joinRoom`, and preserve it in participant normalization. The room's owner participant is the source of truth for the host payment button because the room is the shared state seen by all participants.

Change the link helper interface to accept the selected code:

```text
buildInstapayLink(linkOrUsername, instapayShareCode)
```

Behavior:

- An existing full `https://ipn.eg/...` value is returned unchanged.
- A username is encoded into the existing `/S/<username>/instapay/<code>` shape.
- A valid configured code is used for that username path.
- A missing or invalid code uses a clearly named legacy fallback constant containing `23bZwC`, preserving current behavior for old stored data.

Validate user-entered codes at the UI boundary: trim them, limit their length, and accept only the InstaPay share-code character set used by the existing example (ASCII letters and digits). An invalid non-empty value is rejected with an inline error; an empty value means legacy fallback.

The profile editor saves the local profile and updates the current viewer's matching participant in the active room. If that participant is the owner, the update is queued through the existing remote room PUT, which makes the new code available to other clients. Cancel leaves both profile and room unchanged.

### 2. Plain-text room summary

Add one pure formatter beside the existing share calculation, for example `buildRoomSummary(room)`, so the output is deterministic and testable without rendering React. It should call the existing `calculateShares` and format:

```text
SplitShare — Room ABC123
Mina — EGP 189.71
Omar — EGP 142.29
```

Use participant order from `room.participants`; include each participant even when the current calculation is zero. With no receipt, the existing calculation naturally yields zero amounts. Do not include InstaPay links, app URLs, receipt internals, or settlement state.

Expose the action in `RoomSidebar`, near the invite card/code. Use the existing copy icon and button styles, but keep summary-copy feedback separate from invite-copy feedback so the two actions cannot announce the wrong result. Use `navigator.clipboard.writeText` and an accessible live status; preserve the existing optional-clipboard behavior for local previews.

### 3. SSE room channel

Use native browser `EventSource`; do not add a WebSocket package or another server dependency.

Server endpoint:

```text
GET /api/rooms/:code/events
```

Server behavior:

- Validate the six-character room code and return the existing JSON 404 if the room does not exist.
- Set `text/event-stream`, `cache-control: no-cache`, keep-alive, CORS, and buffering-safe headers.
- Register the response in an in-memory `Map<roomCode, Set<Response>>` and immediately send the current room as a named `room` event, with the same `{ room }` payload shape used by REST.
- On every successful room PUT, persist first, then broadcast the new room to all subscribers for that code. POST does not need a broadcast because a room cannot have an established subscriber before it exists.
- Send a low-frequency SSE comment heartbeat to keep idle connections alive. Remove a response on `close`, clear its heartbeat, and close all subscribers during server shutdown.
- Keep the existing SQLite schema and POST/GET/PUT response contracts unchanged.

`src/lib/syncApi.js` should retain the current JSON request helper and add a small `subscribeToRoom(code, handlers)` wrapper that builds the events URL from the same `VITE_API_BASE` normalization, creates `EventSource`, parses named `room` events, reports `open`/`error`, and returns an idempotent close function.

In `App.jsx`, replace the normal polling effect with a room-code-scoped SSE lifecycle:

1. Open the channel when a room is present and close it when the room changes or the user leaves.
2. On channel open, issue one `getRemoteRoom(code)` reconciliation. If a pushed event arrived while that GET was in flight, do not let the older GET overwrite it; a small per-connection event sequence/ref is enough, and no server version column is needed.
3. Apply a pushed room only when it is for the active room and there is no pending local room write. Reuse the current JSON equality check, `stateRef`, and `saveStoredState` path.
4. Keep `updateRoom`, the serialized PUT queue, retry timer, and 404 handling intact. A successful local PUT clears the dirty marker; its broadcast echo is harmless because it is equal to local state.
5. On SSE error, surface the existing sync status and perform a REST GET fallback. Let native `EventSource` reconnect automatically; if `EventSource` is unavailable, use the existing GET poll logic only as an explicit fallback mode. Clear fallback work when the channel opens and clean up every timer on effect teardown.

This preserves the current last-write-wins full-room PUT semantics. Conflict resolution, auth, presence, and multi-server fan-out are outside this feature.

## Data model

No SQLite migration is required; room state is stored as a JSON blob and unknown/new fields already survive the existing validation.

```text
profile:
  name: string
  instapayLink: string                 # existing, may be legacy username data
  instapayUsername?: string             # legacy input compatibility
  instapayShareCode?: string            # new, optional; empty/missing is legacy
  emoji: string
  id?: string

participant:
  id, name, instapayLink, emoji, initials, color, isOwner,
  settlementStatus, settled                  # existing fields
  instapayShareCode?: string                 # new, copied from profile

room:
  code, createdAt, participants, receipt, ownerId  # unchanged shape
```

Friends remain local-only and do not need a new field for this feature; the payment action uses the shared owner's participant. If a friend is added to a room, the existing participant construction defaults the absent code safely.

## Key interfaces and responsibilities

| Location | Interface/change | Responsibility |
| --- | --- | --- |
| `src/lib/splitShareStore.js` | `makeParticipant({ instapayShareCode })` and participant normalization | Preserve the new field through room creation, joining, and local reload. |
| `src/lib/splitShareStore.js` | `buildInstapayLink(value, shareCode)` | Full-link passthrough, configured username-link code, legacy fallback. |
| `src/lib/splitShareStore.js` | `buildRoomSummary(room)` | Deterministic current-room text using `calculateShares`. |
| `src/App.jsx` | profile form/editor state and save handler | Persist profile, update active participant, queue room update when needed. |
| `src/App.jsx` | `handleCopySummary` and `RoomSidebar` prop | Copy summary and announce success without mixing invite state. |
| `src/lib/syncApi.js` | `subscribeToRoom(code, handlers)` | Native EventSource lifecycle and API-base URL construction. |
| `server/sync-server.mjs` | `/api/rooms/:code/events` plus subscriber registry | Initial snapshot, room-update broadcasts, heartbeats, cleanup. |
| `scripts/check-payment.mjs` | link/profile regression assertions | Configured code, legacy fallback, full-link passthrough, persistence. |
| `scripts/check-math.mjs` | summary assertion | Exact summary text and participant ordering. |
| `scripts/check-sync.mjs` | SSE integration assertions | Headers, initial event, PUT-triggered event, and unchanged REST behavior. |

## Build phases

### Phase 1 — Store compatibility and pure domain helpers

1. Add the optional share-code field to profile/participant construction and normalization.
2. Replace the active link-builder call path with the two-argument helper while preserving full-link passthrough and the legacy fallback.
3. Add the pure room-summary formatter using `calculateShares`.
4. Extend `check-payment.mjs` and `check-math.mjs` with the smallest assertions for configured codes, legacy data, persistence, and summary text.

Verify: `node scripts/check-payment.mjs` and `node scripts/check-math.mjs`.

### Phase 2 — Profile UI and owner payment-link wiring

1. Extend welcome form state with the optional share-code field and include it in create/join profile payloads.
2. Add the compact active-room profile editor opened from the header avatar; save/cancel must be keyboard accessible and must not alter the room until save.
3. On save, persist the profile and update the current participant, then use the existing `updateRoom` queue for the shared participant change.
4. Pass the owner participant's `instapayShareCode` to `buildInstapayLink` in the paid-by-host button.
5. Add only the necessary CSS, reusing `.form-stack`, `.friend-form`, `.button`, `.button-quiet`, `.section-kicker`, and existing focus rules. Keep the header and editor usable at 320–560px.

Verify: build and manually check create, join, profile edit, legacy profile reload, owner-code change, pay-host link, keyboard focus, and empty/error states at desktop and phone widths.

### Phase 3 — Copy summary action

1. Pass the current room summary callback into `RoomSidebar`.
2. Place `Copy summary` by the invite controls and add distinct copied feedback/live status.
3. Confirm copied text changes after receipt edits, participant joins, item assignment changes, and fee changes.

Verify: summary assertion plus manual clipboard check with and without a receipt; ensure pasted text has no app URL or payment link.

### Phase 4 — SSE server and transport wrapper

1. Add the room subscriber registry and cleanup helpers to `server/sync-server.mjs`.
2. Add `GET /api/rooms/:code/events`, initial snapshot, heartbeat, and PUT broadcast without changing the SQLite table.
3. Add `subscribeToRoom` to `src/lib/syncApi.js`, preserving `VITE_API_BASE` and current REST functions.
4. Update `check-sync.mjs` to connect to a temporary server, assert SSE response headers and the initial event, PUT an updated room, assert the pushed updated event, then close the stream and server.

Verify: `npm run check:sync`.

### Phase 5 — Replace polling and final regression pass

1. Replace the `setInterval` room effect in `App.jsx` with the SSE lifecycle, REST-on-open reconciliation, dirty-write guard, error status, and explicit REST fallback.
2. Remove only polling code made obsolete by the healthy SSE path; retain fallback retry logic and existing write retries.
3. Exercise two browser tabs against one room: participant join, receipt edit, item assignment, payment status, profile code edit, summary copy, temporary sync failure, and room leave.
4. Run all required checks and inspect the final diff for accidental changes to parser, receipt math, settlement behavior, Vite host binding, or environment URL handling.

Verify:

```text
node scripts/check-math.mjs
node scripts/check-receipt.mjs
node scripts/check-payment.mjs
npm run check:sync
npm run build
```

## Risks and mitigations

- **SSE connection leaks:** remove each response on `close`, clear per-connection heartbeat timers, and close subscribers from `close()`.
- **Stale REST reconciliation:** open SSE before the GET and skip a GET result if a newer event was observed during the request.
- **Optimistic local overwrite:** retain the current dirty-room guard so a remote event cannot replace an unsent local edit.
- **Network/server outage:** keep REST GET as the initial/error fallback and preserve the current queued PUT retry behavior and localStorage cache.
- **Cross-origin phone setup:** construct the SSE URL with the same `VITE_API_BASE` rules and retain permissive CORS headers; do not touch `vite.config.js`.
- **Legacy payment data:** keep missing share codes empty in storage and use the old code only at username-link construction time.
- **Concurrent full-room writes:** existing last-write-wins behavior remains a known ceiling; per-field merge/versioning would be a separate sync feature.
- **Clipboard availability:** keep the existing optional clipboard handling and visible action feedback; copying is a convenience, not a prerequisite for viewing the room.

## Assumptions and open-questions summary

- SSE is preferred over WebSocket because it is one-way room-state delivery, native in browsers, and available in the existing Node HTTP server without a dependency.
- The active-room header avatar is the profile/edit entry point because the repository has no profile route or existing edit screen.
- Share codes are optional, trimmed ASCII alphanumeric values; the exact InstaPay code is not persisted as a default. Missing values retain the existing `23bZwC` behavior.
- The current room PUT queue and last-write-wins semantics are intentionally preserved; this work does not add authentication, authorization, presence, or cross-process pub/sub.
- No blocking questions require `OPEN_QUESTIONS.md`.
