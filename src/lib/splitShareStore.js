const STORAGE_KEY = 'splitshare-state-v1';
const LEGACY_INSTAPAY_SHARE_CODE = '23bZwC';

export const DEFAULT_COLORS = ['#e27a55', '#6d7fce', '#8b9b66', '#b875b1', '#d39b46'];
export const DEFAULT_EMOJIS = ['🍕', '🍣', '🌮', '🍜', '🥑', '🧋', '🐱', '🦊', '✨', '🍩'];
export const SETTLEMENT_STATUS = { UNPAID: 'unpaid', MARKED_PAID: 'marked-paid', CONFIRMED: 'confirmed' };

export function generateRoomCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export function makeParticipant({ name, instapayLink = '', instapayUsername = '', instapayShareCode = '', emoji = '', isOwner = false, index = 0 }) {
  return {
    id: `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}-${index}`,
    name: name.trim(),
    instapayLink: (instapayLink || instapayUsername).trim(),
    instapayShareCode: String(instapayShareCode || '').trim(),
    initials: name.trim().split(/\s+/).map((word) => word[0]).join('').slice(0, 2).toUpperCase(),
    emoji: emoji || DEFAULT_EMOJIS[index % DEFAULT_EMOJIS.length],
    color: isOwner ? '#111111' : DEFAULT_COLORS[index % DEFAULT_COLORS.length],
    isOwner,
    settlementStatus: SETTLEMENT_STATUS.UNPAID,
    settled: false,
  };
}

function friendInitials(name) {
  return name.split(/\s+/).map((word) => word[0]).join('').slice(0, 2).toUpperCase();
}

function normalizeFriend(friend, index = 0) {
  const name = String(friend?.name || '').trim();
  return {
    id: friend?.id || `friend-${index}`,
    name,
    instapayLink: String(friend?.instapayLink || friend?.instapayUsername || '').trim(),
    initials: friendInitials(name),
    emoji: friend?.emoji || DEFAULT_EMOJIS[index % DEFAULT_EMOJIS.length],
  };
}

export function createFriend(friend) {
  return normalizeFriend({ ...friend, id: `friend-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` });
}

export function updateFriend(friends, friendId, changes) {
  return (friends || []).map((friend, index) => friend.id === friendId ? normalizeFriend({ ...friend, ...changes }, index) : friend);
}

export function removeFriend(friends, friendId) {
  return (friends || []).filter((friend) => friend.id !== friendId);
}

export function createRoom(profile) {
  const owner = makeParticipant({ ...profile, isOwner: true });
  return {
    code: generateRoomCode(),
    createdAt: new Date().toISOString(),
    participants: [owner],
    receipt: null,
    ownerId: owner.id,
  };
}

export function joinRoom(room, profile) {
  if (!room) return null;
  const participant = makeParticipant({ ...profile, index: room.participants.length });
  return { ...room, participants: [...room.participants, participant] };
}

export function getStoredState() {
  try {
    const state = { profile: null, room: null, friends: [], ...(JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}) };
    if (state.profile) state.profile = {
      ...state.profile,
      ...(state.profile.instapayLink ? {} : state.profile.instapayUsername ? { instapayLink: state.profile.instapayUsername } : {}),
      instapayShareCode: String(state.profile.instapayShareCode || '').trim(),
    };
    if (state.room?.participants) state.room = { ...state.room, participants: state.room.participants.map(normalizeParticipant) };
    state.friends = Array.isArray(state.friends) ? state.friends.map(normalizeFriend).filter((friend) => friend.name) : [];
    return state;
  } catch {
    return { profile: null, room: null, friends: [] };
  }
}

export function saveStoredState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function isValidInstapayLink(value) {
  try {
    const url = new URL(String(value).trim());
    return url.protocol === 'https:' && url.hostname === 'ipn.eg' && url.pathname.startsWith('/S/');
  } catch {
    return false;
  }
}

export function isValidInstapayShareCode(value) {
  return !String(value || '').trim() || /^[A-Za-z0-9]{1,32}$/.test(String(value).trim());
}

export function getSettlementStatus(person) {
  return Object.values(SETTLEMENT_STATUS).includes(person?.settlementStatus)
    ? person.settlementStatus
    : person?.settled ? SETTLEMENT_STATUS.CONFIRMED : SETTLEMENT_STATUS.UNPAID;
}

function normalizeParticipant(person) {
  const settlementStatus = getSettlementStatus(person);
  return {
    ...person,
    instapayLink: person.instapayLink || person.instapayUsername || '',
    instapayShareCode: String(person.instapayShareCode || '').trim(),
    settlementStatus,
    settled: settlementStatus === SETTLEMENT_STATUS.CONFIRMED,
  };
}

function setParticipantSettlement(room, participantId, settlementStatus) {
  return {
    ...room,
    participants: room.participants.map((person) => person.id === participantId ? {
      ...person,
      settlementStatus,
      settled: settlementStatus === SETTLEMENT_STATUS.CONFIRMED,
    } : person),
  };
}

export function markParticipantPaid(room, participantId) {
  return setParticipantSettlement(room, participantId, SETTLEMENT_STATUS.MARKED_PAID);
}

export function resetParticipantPaid(room, participantId) {
  return setParticipantSettlement(room, participantId, SETTLEMENT_STATUS.UNPAID);
}

export function confirmParticipantPaid(room, participantId) {
  return setParticipantSettlement(room, participantId, SETTLEMENT_STATUS.CONFIRMED);
}

export function markParticipantSettled(room, participantId) {
  return confirmParticipantPaid(room, participantId);
}

export function buildInstapayLink(linkOrUsername, instapayShareCode = '') {
  const value = String(linkOrUsername || '').trim();
  if (value.startsWith('https://ipn.eg/')) return value;
  const shareCode = isValidInstapayShareCode(instapayShareCode) && String(instapayShareCode).trim()
    ? String(instapayShareCode).trim()
    : LEGACY_INSTAPAY_SHARE_CODE;
  return `https://ipn.eg/S/${encodeURIComponent(value)}/instapay/${shareCode}`;
}

export function calculateReceiptTotal(receipt) {
  const items = (receipt?.items || []).reduce((sum, item) => sum + item.price * item.quantity, 0);
  return roundMoney(items + Number(receipt?.tax || 0) + Number(receipt?.service || 0));
}

export function roundMoney(amount) {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

export function calculateShares(receipt, participantIds) {
  const shares = Object.fromEntries(participantIds.map((id) => [id, { items: 0, taxShare: 0, serviceShare: 0, amount: 0 }]));
  const subtotal = (receipt?.items || []).reduce((sum, item) => sum + item.price * item.quantity, 0);
  (receipt?.items || []).forEach((item) => {
    const assignedTo = item.assignedTo?.length ? item.assignedTo : participantIds;
    const itemShare = item.price * item.quantity / assignedTo.length;
    assignedTo.forEach((id) => {
      if (shares[id]) shares[id].items += itemShare;
    });
  });
  participantIds.forEach((id) => {
    const ratio = subtotal ? shares[id].items / subtotal : 1 / Math.max(participantIds.length, 1);
    shares[id].taxShare = Number(receipt?.tax || 0) * ratio;
    shares[id].serviceShare = Number(receipt?.service || 0) * ratio;
    shares[id].amount = roundMoney(shares[id].items + shares[id].taxShare + shares[id].serviceShare);
    shares[id].items = roundMoney(shares[id].items);
  });
  return shares;
}

export function buildRoomSummary(room) {
  const participants = room?.participants || [];
  const shares = calculateShares(room?.receipt, participants.map((person) => person.id));
  return [`SplitShare — Room ${room?.code || ''}`, ...participants.map((person) => `${person.name} — EGP ${Number(shares[person.id]?.amount || 0).toFixed(2)}`)].join('\n');
}
