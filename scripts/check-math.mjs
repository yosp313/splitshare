import assert from 'node:assert/strict';
import { calculateShares, calculateReceiptTotal } from '../src/lib/splitShareStore.js';

const receipt = {
  items: [
    { id: 'a', name: 'Koshari', quantity: 1, price: 120, assignedTo: ['me'] },
    { id: 'b', name: 'Lemonade', quantity: 2, price: 40, assignedTo: ['friend'] },
    { id: 'c', name: 'Fries', quantity: 1, price: 80, assignedTo: ['me', 'friend'] },
  ],
  tax: 28,
  service: 24,
};

assert.equal(calculateReceiptTotal(receipt), 332);
const shares = calculateShares(receipt, ['me', 'friend']);
assert.equal(shares.me.items, 160);
assert.equal(shares.friend.items, 120);
assert.equal(shares.me.amount, 189.71);
assert.equal(shares.friend.amount, 142.29);
assert.equal(shares.me.amount + shares.friend.amount, 332);
console.log('math checks passed: total 332, split 189.71 / 142.29');
