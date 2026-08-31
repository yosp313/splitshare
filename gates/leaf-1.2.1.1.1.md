# Gates: Splitting

Scope: Item assignment and participant owed summaries.

- [x] G1: Every receipt item can be assigned to a participant or shared.
  CHECK: rg -n "assignedTo|Shared|Assign|handleAssignment" src/App.jsx
  EXPECT: assignedTo
  EVIDENCE: 202:  const handleAssignment = (id, personId) => updateReceipt((receipt) => ({ ...receipt, items: receipt.items.map((item) => item.id === id ? { ...item, assignedTo: personId === 'shared' ? state.room

- [x] G2: Owed amounts include item shares and proportional tax/service.
  CHECK: rg -n "calculateShares|itemShares|taxShare|serviceShare|amount" src/lib/splitShareStore.js src/App.jsx
  EXPECT: calculateShares
  EVIDENCE: src/lib/splitShareStore.js:71:    shares[id].serviceShare = Number(receipt?.service || 0) * ratio; | src/lib/splitShareStore.js:72:    shares[id].amount = roundMoney(shares[id].items + shares[id].taxS
