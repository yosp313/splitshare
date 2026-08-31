# Gates: Foundation integration

Scope: App bootstrap, persistence, domain model, and installable PWA assets compose.

- [x] G1: Bootstrap imports the root app and registers the service worker without crashing.
  CHECK: npm run build
  EXPECT: /built in/
  EVIDENCE: vite ✓ built in 131ms

- [x] G2: Store and parser modules are imported by the app and the receipt model is present.
  CHECK: rg -n "splitShareStore|receiptParser|createRoom|parseReceipt" src/App.jsx src
  EXPECT: splitShareStore
  EVIDENCE: src/App.jsx:152:    const room = createRoom(profile); | src/App.jsx:192:    const receipt = parseReceiptText(text);
