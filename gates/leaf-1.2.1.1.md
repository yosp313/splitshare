# Gates: Receipt capture

Scope: Upload, preview, parsing state, parsed receipt review, and fee editing.

- [x] G1: Receipt upload previews an image and offers a parsing action.
  CHECK: rg -n "Upload receipt|receiptImage|Analyze receipt|input.*file" src/App.jsx
  EXPECT: Upload receipt
  EVIDENCE: 139:  const [receiptImage, setReceiptImage] = useState(''); | 208:  return <RoomView state={state} onLogout={handleLogout} onUpload={handleUpload} onAnalyze={handleAnalyze} isParsing={isParsing} recei

- [x] G2: Parsed items, tax, service, and total are editable in the room UI.
  CHECK: rg -n "Receipt items|onItemChange|tax|service|total" src/App.jsx
  EXPECT: Receipt items
  EVIDENCE: 129:    <div className="room-layout"><ReceiptEditor room={room} receipt={room.receipt} receiptImage={receiptImage} isParsing={isParsing} onUpload={onUpload} onAnalyze={onAnalyze} onItemChange={onItemC
