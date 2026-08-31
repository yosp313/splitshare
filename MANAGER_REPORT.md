# Manager Report

Verdict: FIX-NEEDED

## Top issues

1. **High — SSE failure does not reliably enter REST polling fallback.**
   - **What:** An `EventSource` that is constructed successfully but later calls `onerror` triggers one `pullRoom()` only; the 2-second fallback interval starts only when construction throws.
   - **Why it matters:** This misses the explicit acceptance criterion that SSE failure leaves the room usable through REST fallback. A dead channel can leave the room stale indefinitely.
   - **Responsible:** Coder.
   - **Suggested action:** Start the existing polling fallback from the asynchronous error path, clear it on channel open, and clean it up on teardown. Add a regression check for a constructed-but-failing `EventSource`.
   - **Basis:** Tester reproduced one GET after 5.5 seconds; PLAN.md requires REST fallback on SSE error.

2. **Medium — Summary clipboard rejection is silent.**
   - **What:** `handleCopySummary` swallows `writeText` rejection without changing the summary status or announcing an error.
   - **Why it matters:** Users receive no feedback when the requested action fails, and the plan calls for accessible, distinct summary-copy feedback.
   - **Responsible:** Coder.
   - **Suggested action:** Add a separate visible/live error state for summary-copy failure and cover rejected clipboard writes.
   - **Basis:** Tester’s browser probe found no button change or alert/status after rejection.

3. **High — Integer receipt amounts are misparsed.**
   - **What:** The parser’s decimal-only amount matching merges integer-priced item and summary lines, producing incorrect items and fees.
   - **Why it matters:** It violates the requirement that existing receipt parsing continue to work and can produce incorrect participant amounts.
   - **Responsible:** Pre-existing parser owner; not a coder regression.
   - **Suggested action:** Accept integer and decimal amounts in the parser and add a deterministic integer-price assertion before release.
   - **Basis:** Tester’s `DEMO_TEXT` reproduction; the defect is explicitly reported as unchanged core behavior.

4. **Medium — Per-participant rounding does not reconcile to the receipt total.**
   - **What:** Rounding each participant independently can charge two cents for a one-cent shared item or lose the cent entirely.
   - **Why it matters:** This is a money-integrity defect in the existing calculation path, even though it was not introduced by this feature.
   - **Responsible:** Pre-existing receipt-math owner; not a coder regression.
   - **Suggested action:** Allocate residual cents deterministically after rounding and add a reconciliation assertion for fractional shared amounts.
   - **Basis:** Tester’s two- and three-participant `EGP 0.01` reproductions.

5. **Low — Summary names can inject additional lines or payment-looking text.**
   - **What:** A participant name containing a newline is copied verbatim into the plain-text summary.
   - **Why it matters:** Copied output can spoof participant lines or appear to contain an InstaPay URL, undermining the summary’s deterministic, non-payment presentation.
   - **Responsible:** Coder.
   - **Suggested action:** Normalize line breaks in participant names before formatting and add a hostile-name assertion.
   - **Basis:** Tester reproduced a forged-looking second line and URL in `buildRoomSummary` output.

## Fidelity and test assessment

The implementation covers the planned profile/share-code flow, deterministic summary formatter, native SSE server/client flow, optimistic PUT preservation, and explicit fallback mode. The reported files and passing verification commands match the plan, and there is no evidence of a broad architectural deviation.

The break report identifies one direct plan miss: asynchronous SSE failure does not activate polling fallback. The clipboard failure and summary-name issue are additional implementation gaps. The parser and rounding findings are credible release concerns but are pre-existing defects, not evidence that the coder regressed those areas. All required checks passed, but they do not cover these edge cases or the asynchronous SSE failure path.

## What I would tell the human right now

Do not ship yet. The requested feature is mostly on track, but fix and test the SSE fallback first because it can silently stale a room. Also decide whether the pre-existing parser and cent-allocation defects are release blockers; both can produce incorrect money results. The summary-copy failure should at least announce failure to the user.
