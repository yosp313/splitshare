# Gates: Domain state

Scope: Local persistence, room creation/joining, receipt parsing, and bill math.

- [x] G1: The store exposes profile, room, and receipt persistence plus room code generation.
  CHECK: rg -n "getStoredState|saveStoredState|createRoom|joinRoom|generateRoomCode" src/lib/splitShareStore.js
  EXPECT: getStoredState
  EVIDENCE: 37:export function getStoredState() { | 45:export function saveStoredState(state) {

- [x] G2: Receipt parser handles quantity, prices, subtotal, tax, service, and total lines.
  CHECK: rg -n "quantity|subtotal|tax|service|total|parseReceipt" src/lib/receiptParser.js
  EXPECT: parseReceipt
  EVIDENCE: 36:  const merchant = lines.find((line) => !/^\d|subtotal|service|tax|total/i.test(line)) || 'Your receipt'; | 38:  return { merchant, date: lines.find((line) => /\d{1,2}.(?:aug|sep|jan|feb|mar|apr|ma

- [x] G3: Math checks pass.
  CHECK: node scripts/check-math.mjs
  EXPECT: /math checks passed/
  EVIDENCE: math checks passed: total 332, split 189.71 / 142.29
