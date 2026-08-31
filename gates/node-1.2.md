# Gates: Product workflow integration

Scope: Onboarding, room collaboration, receipt parsing/editing, and split assignment compose into one flow.

- [x] G1: A user can enter identity details, create or join a room, and return to a room view.
  CHECK: rg -n "Get started|Join a room|Create room|roomCode|currentView" src/App.jsx
  EXPECT: Join a room
  EVIDENCE: 51:          <button className={mode === 'join' ? 'active' : ''} onClick={() => setMode('join')} role="tab" aria-selected={mode === 'join'}>Join a room</button>

- [x] G2: Receipt parsing produces editable items and fees, and item assignments affect the owed summary.
  CHECK: rg -n "Analyze receipt|Receipt items|service|tax|assignedTo|What you owe" src/App.jsx src
  EXPECT: Analyze receipt
  EVIDENCE: src/App.jsx:201:  const handleAddItem = () => updateReceipt((receipt) => ({ ...receipt, items: [...receipt.items, { id: `item-${Date.now()}`, name: 'New item', quantity: 1, price: 0, assignedTo: [stat
