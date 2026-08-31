# Gates: Entry and room

Scope: Profile onboarding, join/create room entry, invite code, and participant list.

- [x] G1: Onboarding collects name and InstaPay phone before entering the room.
  CHECK: rg -n "Your name|InstaPay phone|name|phone" src/App.jsx
  EXPECT: Your name
  EVIDENCE: 204:  const handleAddParticipant = (name) => updateRoom((room) => joinRoom(room, { name, phone: '' })); | 205:  const handleLogout = () => { const cleared = { profile: null, room: null }; saveStoredSt

- [x] G2: Room view exposes a copyable six-character invite code and participant controls.
  CHECK: rg -n "Invite friends|copyInvite|room.code|Add friend|People" src/App.jsx
  EXPECT: Room invite
  EVIDENCE: 160:    if (!state.room || state.room.code !== form.code.toUpperCase()) return setError('That room is not on this device yet. Ask the host to create it here first.'); | 203:  const handleCopyInvite = 
