# Gates: InstaPay links and settlement status

Scope: Let hosts save an InstaPay shareable link with their name and show settled friends in the people list.

- [x] G1: The create-room form accepts an InstaPay shareable link, stores it on the host participant/profile, and the pay-host action uses that saved link.
  CHECK: rtk rg -n "InstaPay shareable link|ownerInstapayLink|instapayLink" src/App.jsx src/lib/splitShareStore.js
  EXPECT: /ownerInstapayLink/
  EVIDENCE: src/App.jsx:121:  const ownerInstapayLink = owner?.instapayLink || owner?.instapayUsername; | src/App.jsx:127: ... href={buildInstapayLink(ownerInstapayLink)} ...

- [x] G2: A saved profile survives leaving a room in localStorage and is available to prefill the create form.
  CHECK: rtk rg -n "profile: stateRef\.current\.profile|profile\.instapayLink|profile\.name" src/App.jsx
  EXPECT: /profile: stateRef\.current\.profile/ 
  EVIDENCE: 135:  const viewer = room.participants.find((person) => person.id === profile.id) || room.participants.find((person) => person.name === profile.name) || room.participants[0]; | 293:  const handleLogou

- [x] G3: Settled participants show a checkmark beside their name, and the state remains persisted/synced.
  CHECK: rtk rg -n "person\.settled|markParticipantSettled|saveStoredState|queueRemoteRoom" src/App.jsx src/lib/splitShareStore.js
  EXPECT: /person\.settled.*Icon name="check"|markParticipantSettled.*saveStoredState|queueRemoteRoom/
  EVIDENCE: src/App.jsx:122: confirmed settlement status renders the checkmark | src/App.jsx:288: markParticipantPaid uses updateRoom persistence and sync

- [x] G4: The production build succeeds.
  CHECK: rtk npm run build
  EXPECT: /built in|dist/
  EVIDENCE: dist/assets/index-THR_-bPR.js 235.70 kB │ gzip: 75.90 kB | ✓ built in 93ms

- [x] G5: The store's non-trivial link and settlement behavior passes a runnable self-check.
  CHECK: rtk node scripts/check-payment.mjs
  EXPECT: /payment checks passed/
  EVIDENCE: payment checks passed: InstaPay link and settlement checks passed

# Gates: explicit settlement states

Scope: Track unpaid, participant-marked-paid, and host-confirmed settlement states without claiming payment verification.

- [x] S1: New participants start unpaid, marking paid does not imply host confirmation, confirmation sets the legacy settled flag, and reset returns to unpaid.
  CHECK: rtk node scripts/check-payment.mjs
  EXPECT: /settlement checks passed/
  EVIDENCE: payment checks passed: InstaPay link and settlement checks passed

- [x] S2: Existing stored participants with only the legacy settled flag render as confirmed and continue to work.
  CHECK: rtk rg -n "settlementStatus.*settled|settled.*confirmed|getSettlementStatus" src/App.jsx src/lib/splitShareStore.js
  EXPECT: /confirmed/
  EVIDENCE: src/App.jsx:121:      <div className="people-list">{room.participants.map((person) => { const settlementStatus = getSettlementStatus(person); return <div className="person-row" key={person.id}><Avatar

- [x] S3: Participants can mark their own share paid, undo it, and see that host confirmation is still pending; only the host can confirm another participant.
  CHECK: rtk rg -n "I've paid|Undo paid|Waiting for host|Confirm payment|viewerId === room\.ownerId" src/App.jsx
  EXPECT: /Confirm payment/
  EVIDENCE: 121:      <div className="people-list">{room.participants.map((person) => { const settlementStatus = getSettlementStatus(person); return <div className="person-row" key={person.id}><Avatar person={per

- [x] S4: Settlement status persists through the existing local save and remote room update path.
  CHECK: rtk rg -n "updateRoom.*markParticipant|queueRemoteRoom|saveStoredState" src/App.jsx
  EXPECT: /queueRemoteRoom/
  EVIDENCE: 288:  const handleMarkPaid = (participantId) => updateRoom((room) => markParticipantPaid(room, participantId)); | 293:  const handleLogout = () => { const cleared = { profile: stateRef.current.profile

- [x] S5: The production build succeeds.
  CHECK: rtk npm run build
  EXPECT: /built in|dist\//
  EVIDENCE: dist/assets/index-THR_-bPR.js 235.70 kB │ gzip: 75.90 kB | ✓ built in 93ms

# Gates: scratch friends feature

Scope: Remove the local friends feature without changing the existing room and settlement flows.

- [x] R1: The friends-specific source, styles, and test script are absent.
  CHECK: rtk node -e 'const fs = require("node:fs"); const files = ["src/App.jsx", "src/lib/splitShareStore.js", "src/styles.css", "scripts"]; const text = files.flatMap((file) => fs.statSync(file).isDirectory() ? fs.readdirSync(file).map((name) => fs.readFileSync(`${file}/${name}`, "utf8")) : [fs.readFileSync(file, "utf8")]).join("\n"); if (fs.existsSync("scripts/check-friends.mjs") || /addFriend|onSaveFriend|onAddFriendToRoom|friends-block|friend-form/.test(text)) process.exit(1); console.log("friends-feature-removed");'
  EXPECT: /friends-feature-removed/
  EVIDENCE: friends-feature-removed

- [x] R2: The production build and existing domain checks still pass after removal.
  CHECK: rtk npm run build && rtk node scripts/check-math.mjs && rtk node scripts/check-receipt.mjs && rtk node scripts/check-payment.mjs && rtk npm run check:sync
  EXPECT: /built in.*math checks passed.*receipt OCR checks passed.*payment checks passed.*sync checks passed/s
  EVIDENCE: sync checks passed: SQLite persisted room state | api checks passed: create, get, update, validation, and 404
