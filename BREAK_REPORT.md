# Break Report

## 1. SSE errors never enter the required polling fallback

Severity: high

Steps to reproduce:

1. Start the Vite app with a room already present in localStorage.
2. Replace `EventSource` before the app loads with a fake that invokes `onerror` once and never reconnects.
3. Count `fetch` calls and leave the room open for 5.5 seconds.

Expected: after an SSE error, REST polling continues every 2 seconds so the room remains usable while SSE is unavailable.

Actual: the error handler calls `pullRoom()` once. `startFallback()` is only called by the synchronous `subscribeToRoom` catch, so a constructed-but-failing EventSource has no polling timer.

Evidence:

```text
fake SSE URL: /api/rooms/UI1234/events
fake SSE close called: False
GET calls after 5.5s: 1
sync status: ['Sync server unavailable.']
```

The source path is `onError -> pullRoom()` at `src/App.jsx:254-258`; the only `setInterval(pullRoom, 2000)` is at `src/App.jsx:237-240` under `startFallback()`.

## 2. Summary clipboard failures give no user feedback

Severity: medium

Steps to reproduce:

1. Open a room and click `Copy summary`.
2. Before clicking, replace `navigator.clipboard.writeText` with a function that rejects with `Error('blocked')`.

Expected: the summary action announces a visible copy error, independently of invite-copy feedback.

Actual: the rejection is swallowed; the button remains `Copy summary` and no alert/status is rendered.

Evidence from a browser probe:

```text
summary button: Copy summary
patch clipboard: patched
click: clicked
after failure button: Copy summary
after failure alerts/status: []
```

`handleCopySummary` at `src/App.jsx:386` has an empty catch comment and no error state.

## 3. Integer receipt amounts corrupt the parsed receipt

Severity: high

This is an unchanged core-parser failure, not a regression introduced by the coder commit; it is included because this pass explicitly covers receipt parsing/math.

Steps to reproduce:

```js
parseReceiptText(DEMO_TEXT)
```

Expected: the demo receipt yields its four item lines (`180`, `240`, `260`, and `45`) and the corresponding fee fields.

Actual: integer amounts do not match the parser's decimal-only amount regex. The parser merges summary lines into one malformed item and misidentifies fees.

Evidence:

```text
demo parsed: {"items":[{"id":"item-5","name":"Still water              45 SUBTOTAL                  725 SERVICE","quantity":1,"price":72.5,"assignedTo":[]}],"subtotal":72.5,"tax":36.25,"service":725,"total":833.75}
demo calculated total from parsed shape: 833.75
```

## 4. Share rounding can overcharge or undercharge by a cent

Severity: medium

This is an unchanged core-money edge case, not a regression introduced by the coder commit.

Steps to reproduce:

```js
calculateShares(
  { items: [{ price: 0.01, quantity: 1, assignedTo: ['a', 'b'] }], tax: 0, service: 0 },
  ['a', 'b'],
)
```

Expected: the rounded participant amounts reconcile to the receipt total of EGP 0.01.

Actual: each participant is charged EGP 0.01, so the shares total EGP 0.02. With three participants, the same EGP 0.01 item rounds every participant to EGP 0.00, losing the cent entirely.

Evidence:

```text
0.01 shared by 2: {"a":{"items":0.01,"taxShare":0,"serviceShare":0,"amount":0.01},"b":{"items":0.01,"taxShare":0,"serviceShare":0,"amount":0.01}} sum= 0.02 receipt= 0.01
0.01 shared by 3: {"a":{"items":0,"taxShare":0,"serviceShare":0,"amount":0},"b":{"items":0,"taxShare":0,"serviceShare":0,"amount":0},"c":{"items":0,"taxShare":0,"serviceShare":0,"amount":0}} sum= 0
```

## 5. Summary participant names can inject fake lines/payment URLs

Severity: low

Steps to reproduce:

```js
buildRoomSummary({
  code: 'ABC123',
  receipt: null,
  participants: [{ id: 'a', name: 'Mina\nOmar — EGP 999.99 https://ipn.eg/S/fake' }],
})
```

Expected: the copied summary remains one deterministic participant line and contains no payment link.

Actual: the raw participant name is copied verbatim, allowing a newline and payment-looking URL to spoof additional summary content.

Evidence:

```text
malicious summary: "SplitShare — Room ABC123\nMina\nOmar — EGP 999.99 https://ipn.eg/S/fake — EGP 0.00"
```

## Attempts that resisted breaking

- Configured alphanumeric share codes, whitespace trimming, the 32-character boundary, invalid characters, legacy fallback, full-link passthrough, profile reload, and participant propagation passed.
- Summary output with no receipt, zero-amount participants, and changed participant order passed.
- Two SSE subscribers received initial snapshots and PUT broadcasts; heartbeat arrived at 25,000 ms; canceled streams were cleaned up without a later PUT crash.
- SSE missing-room and non-GET route handling returned 404/405 as expected.
- `npm run build` passed.
