import assert from 'node:assert/strict';
import { buildInstapayLink, confirmParticipantPaid, createRoom, getSettlementStatus, getStoredState, joinRoom, markParticipantPaid, resetParticipantPaid, saveStoredState, SETTLEMENT_STATUS } from '../src/lib/splitShareStore.js';

const instapayLink = 'https://ipn.eg/S/youssef.ayman-7168/instapay/23bZwC';
const room = createRoom({ name: 'Youssef Ayman', instapayLink });
const host = room.participants[0];
assert.equal(host.instapayLink, instapayLink);
assert.equal(getSettlementStatus(host), SETTLEMENT_STATUS.UNPAID);
assert.equal(host.settled, false);
assert.equal(buildInstapayLink(host.instapayLink), instapayLink);
const configuredRoom = createRoom({ name: 'Mina', instapayLink: 'mina.pay', instapayShareCode: 'Ab12Z9' });
assert.equal(configuredRoom.participants[0].instapayShareCode, 'Ab12Z9');
assert.equal(buildInstapayLink('mina.pay', configuredRoom.participants[0].instapayShareCode), 'https://ipn.eg/S/mina.pay/instapay/Ab12Z9');
assert.equal(buildInstapayLink('mina.pay', 'bad code'), 'https://ipn.eg/S/mina.pay/instapay/23bZwC');
assert.equal(buildInstapayLink(instapayLink, 'different'), instapayLink);

const storage = new Map();
globalThis.localStorage = { getItem: (key) => storage.get(key), setItem: (key, value) => storage.set(key, value) };
saveStoredState({ profile: { name: host.name, instapayLink: host.instapayLink }, room });
assert.equal(JSON.parse(storage.get('splitshare-state-v1')).profile.instapayLink, instapayLink);
assert.equal(getStoredState().profile.instapayShareCode, '');
assert.equal(getStoredState().room.participants[0].instapayShareCode, '');

const joinedWithCode = joinRoom(configuredRoom, { name: 'Omar', instapayLink: 'omar.pay', instapayShareCode: 'Q7rT2' });
assert.equal(joinedWithCode.participants[1].instapayShareCode, 'Q7rT2');

const friendRoom = joinRoom(room, { name: 'Mina' });
const markedRoom = markParticipantPaid(friendRoom, friendRoom.participants[1].id);
assert.equal(getSettlementStatus(markedRoom.participants[1]), SETTLEMENT_STATUS.MARKED_PAID);
assert.equal(markedRoom.participants[1].settled, false);
const confirmedRoom = confirmParticipantPaid(markedRoom, friendRoom.participants[1].id);
assert.equal(getSettlementStatus(confirmedRoom.participants[1]), SETTLEMENT_STATUS.CONFIRMED);
assert.equal(confirmedRoom.participants[1].settled, true);
const resetRoom = resetParticipantPaid(markedRoom, friendRoom.participants[1].id);
assert.equal(getSettlementStatus(resetRoom.participants[1]), SETTLEMENT_STATUS.UNPAID);
assert.equal(resetRoom.participants[1].settled, false);
assert.equal(room.participants[0].settled, false);

saveStoredState({ profile: null, room: { ...room, participants: [{ ...host, settlementStatus: undefined, settled: true }] } });
assert.equal(getSettlementStatus(getStoredState().room.participants[0]), SETTLEMENT_STATUS.CONFIRMED);
console.log('payment checks passed: InstaPay link and settlement checks passed');
