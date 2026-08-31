import assert from 'node:assert/strict';
import { parseReceiptText } from '../src/lib/receiptParser.js';

const receipt = parseReceiptText(`W Marriott Hotels+
12 Feb'21 17:47 PM
1 Pomodoro Buffala 140,00
1 Bruschetta Della
Tradizione 80.00
3 French Fries @ 45,00 135.00
2 Tagliata Di Manzo &
450.00 900.00
1 Pollo Al Linone 240.00
2 Pepsi 6 60.00 120.00
ubtotal 1615400LE
2% Service Chargel 4198.80LE
VAT Tax 253.23LE
Total Due 2062.03LE`);

assert.equal(receipt.items.length, 6);
assert.deepEqual(receipt.items.map(({ name, quantity, price }) => ({ name, quantity, price })), [
  { name: 'Pomodoro Buffala', quantity: 1, price: 140 },
  { name: 'Bruschetta Della Tradizione', quantity: 1, price: 80 },
  { name: 'French Fries', quantity: 3, price: 45 },
  { name: 'Tagliata Di Manzo', quantity: 2, price: 450 },
  { name: 'Pollo Al Linone', quantity: 1, price: 240 },
  { name: 'Pepsi', quantity: 2, price: 60 },
]);
assert.equal(receipt.subtotal, 1615);
assert.equal(receipt.service, 193.8);
assert.equal(receipt.tax, 253.23);
assert.equal(receipt.total, 2062.03);
console.log('receipt OCR checks passed: 6 items, subtotal 1615, total 2062.03');
