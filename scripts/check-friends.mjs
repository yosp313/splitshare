import assert from 'node:assert/strict';
import { createFriend, getStoredState, isValidInstapayLink, removeFriend, saveStoredState, updateFriend } from '../src/lib/splitShareStore.js';

const storage = new Map();
globalThis.localStorage = { getItem: (key) => storage.get(key), setItem: (key, value) => storage.set(key, value) };

saveStoredState({ profile: { name: 'Mina', instapayLink: 'https://ipn.eg/S/mina/instapay/demo', emoji: '🍕' }, room: null });
assert.deepEqual(getStoredState().friends, []);

const friend = createFriend({ name: 'Omar Khaled', instapayLink: 'https://ipn.eg/S/omar/instapay/demo', emoji: '🍣' });
assert.deepEqual({ name: friend.name, instapayLink: friend.instapayLink, initials: friend.initials, emoji: friend.emoji }, { name: 'Omar Khaled', instapayLink: 'https://ipn.eg/S/omar/instapay/demo', initials: 'OK', emoji: '🍣' });
assert.equal(isValidInstapayLink(friend.instapayLink), true);
assert.equal(isValidInstapayLink('http://ipn.eg/S/omar'), false);
assert.equal(isValidInstapayLink('https://example.com/S/omar'), false);

const updated = updateFriend([friend], friend.id, { name: 'Omar K.', instapayLink: 'https://ipn.eg/S/omar-k/instapay/demo' });
assert.equal(updated[0].name, 'Omar K.');
assert.equal(updated[0].instapayLink, 'https://ipn.eg/S/omar-k/instapay/demo');
assert.deepEqual(removeFriend(updated, friend.id), []);

saveStoredState({ profile: { name: 'Mina', instapayLink: 'https://ipn.eg/S/mina/instapay/demo', emoji: '🍕' }, room: null, friends: updated });
const restored = getStoredState();
assert.deepEqual(restored.profile, { name: 'Mina', instapayLink: 'https://ipn.eg/S/mina/instapay/demo', emoji: '🍕' });
assert.deepEqual(restored.friends, updated);
console.log('friend checks passed: profile migration and friend CRUD persistence');
