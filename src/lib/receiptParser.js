const DEMO_TEXT = `NILE & COFFEE
18 AUG 2026
2  Flat white             180
1  Halloumi toast         240
1  Shakshuka              260
1  Still water              45
SUBTOTAL                  725
SERVICE                    72.5
TAX                        36.25
TOTAL                     833.75`;

export function parseReceiptText(rawText = '') {
  const text = rawText.trim() || DEMO_TEXT;
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const money = '(\\d+[.,]\\d{1,2})';
  const items = [];

  const isSummary = (line) => /subtotal|ubtotal|service|tax|total|receipt|date|cash|visa|thank|chk|tbl|gst/i.test(line);
  const hasAmountAtEnd = (line) => /\d+[.,]\d{1,2}\s*(?:le|l\.?e\.?|egp)?$/i.test(line);
  const itemLines = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (isSummary(line) || !/^\d+\s+/.test(line)) continue;
    let combined = line;
    while (!hasAmountAtEnd(combined) && index + 1 < lines.length && !/^\d+\s+/.test(lines[index + 1])) {
      combined += ` ${lines[++index]}`;
    }
    itemLines.push(combined);
  }

  itemLines.forEach((line, index) => {
    const match = line.match(/^(\d+)\s+(.+)$/);
    if (!match) return;
    const quantity = Number(match[1]);
    const body = match[2];
    const amounts = [...body.matchAll(/\d+(?:[.,]\d{1,2})/g)];
    if (!amounts.length || quantity <= 0) return;
    const firstAmount = amounts[0];
    const name = body.slice(0, firstAmount.index).replace(/(?:@|&)\s*$/, '').replace(/\s+\d\s*$/, '').trim();
    const total = parseMoney(amounts.at(-1)[0]);
    if (!name || total <= 0) return;
    items.push({ id: `item-${index + 1}`, name, quantity, price: total / quantity, assignedTo: [] });
  });

  const findValue = (pattern) => {
    const line = lines.find((item) => pattern.test(item));
    const matches = line?.match(new RegExp(money, 'g'));
    return matches?.length ? parseMoney(matches.at(-1)) : 0;
  };
  const subtotal = findValue(/subtotal|ubtotal/i) || items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = findValue(/(?:vat\s+)?tax/i);
  const parsedService = findValue(/service/i);
  const total = findValue(/total\s+due|^total\b/i) || subtotal + tax + parsedService;
  // ponytail: reconcile noisy fee OCR from the receipt total; discounts need explicit parser support.
  const service = total && Math.abs(total - subtotal - tax - parsedService) > 0.01 ? Math.max(0, Number((total - subtotal - tax).toFixed(2))) : parsedService;
  const merchant = lines.find((line) => !/^\d|subtotal|service|tax|total/i.test(line)) || 'Your receipt';

  return { merchant, date: lines.find((line) => /\d{1,2}.(?:aug|sep|jan|feb|mar|apr|may|jun|jul|oct|nov|dec)/i.test(line)) || 'Today', items, subtotal, tax, service, total };
}

function parseMoney(value) {
  const normalized = String(value).replace(',', '.');
  return Number(normalized) || 0;
}

export { DEMO_TEXT };
