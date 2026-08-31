import { useEffect, useMemo, useRef, useState } from 'react';
import { createWorker } from 'tesseract.js';
import { buildInstapayLink, calculateReceiptTotal, calculateShares, confirmParticipantPaid, createFriend, createRoom, DEFAULT_EMOJIS, getSettlementStatus, getStoredState, isValidInstapayLink, joinRoom, markParticipantPaid, removeFriend, resetParticipantPaid, saveStoredState, SETTLEMENT_STATUS, updateFriend } from './lib/splitShareStore';
import { parseReceiptText } from './lib/receiptParser';
import { createRemoteRoom, getRemoteRoom, updateRemoteRoom } from './lib/syncApi';

const money = (value) => `EGP ${Number(value || 0).toFixed(2)}`;

const iconPaths = {
  arrow: 'M5 12h14M13 6l6 6-6 6',
  camera: 'M4 8h3l1.5-2h7L17 8h3v10H4V8Zm5 5a3 3 0 1 0 6 0 3 3 0 0 0-6 0Z',
  check: 'm5 12 4 4L19 6',
  copy: 'M8 8V5h11v11h-3M5 8h11v11H5V8Z',
  edit: 'm14 6 4 4M5 19l3.4-.7L19 8a2.1 2.1 0 0 0-3-3L5.4 15.3 5 19Z',
  plus: 'M12 5v14M5 12h14',
  receipt: 'M6 3h12v18l-3-2-3 2-3-2-3 2V3Zm3 5h6M9 12h6M9 16h3',
  scan: 'M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M8 12h8M12 8v8',
  share: 'M18 8a3 3 0 1 0-2.8-4A3 3 0 0 0 15 5.3l-6.1 3.4a3 3 0 1 0 0 6.6l6.1 3.4A3 3 0 1 0 16 17l-6.1-3.4a3 3 0 0 0 0-2.6L16 7.6c.5.3 1.1.4 2 .4Z',
  spark: 'm12 3 1.4 5.6L19 10l-5.6 1.4L12 17l-1.4-5.6L5 10l5.6-1.4L12 3Zm6 13 .6 2.4L21 19l-2.4.6L18 22l-.6-2.4L15 19l2.4-.6L18 16Z',
  trash: 'M5 7h14M10 11v5M14 11v5M7 7l1 13h8l1-13M9 7l1-3h4l1 3',
  upload: 'M12 16V4m0 0L8 8m4-4 4 4M5 15v4h14v-4',
  users: 'M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20m6-8a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm6-6a3 3 0 0 1 2 5.2M20 20v-1.5a3.5 3.5 0 0 0-2-3.2',
};

function Icon({ name, size = 18 }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={iconPaths[name]} /></svg>;
}

function Brand() {
  return <div className="brand"><span className="brand-mark"><Icon name="receipt" size={22} /></span><span>SplitShare</span></div>;
}

function Avatar({ person, small = false }) {
  return <span className={`avatar ${small ? 'avatar-small' : ''}`}>{person.emoji || person.initials}</span>;
}

function EmojiPicker({ value, onChange, compact = false }) {
  return <div className={`emoji-picker ${compact ? 'emoji-picker-compact' : ''}`} role="group" aria-label="Choose a profile emoji">
    {DEFAULT_EMOJIS.map((emoji) => <button key={emoji} type="button" className={`emoji-option ${value === emoji ? 'is-selected' : ''}`} onClick={() => onChange(emoji)} aria-label={`Use ${emoji} as profile picture`} aria-pressed={value === emoji}>{emoji}</button>)}
  </div>;
}

function Welcome({ mode, setMode, form, setForm, onCreate, onJoin, error }) {
  return <main className="welcome-page">
    <div className="welcome-nav"><Brand /><span className="nav-note">Made for the table</span></div>
    <section className="welcome-grid">
      <div className="welcome-copy">
        <div className="eyebrow"><span className="eyebrow-dot" /> bill splitting, without the group chat math</div>
        <h1>Good food.<br /><em>Fair share.</em></h1>
        <p className="hero-lede">Snap the receipt, invite your people, and leave the awkward arithmetic to us.</p>
        <div className="story-art" aria-hidden="true">
          <div className="story-stage story-stage-scan"><span className="story-label">01 / scan</span><div className="story-receipt"><Icon name="receipt" size={31} /><span className="story-scan-line" /></div><span className="story-chip">EGP 480</span></div>
          <span className="story-arrow"><Icon name="arrow" size={16} /></span>
          <div className="story-stage story-stage-split"><span className="story-label">02 / split</span><div className="story-people"><span>🙂</span><span>😎</span><span>🤠</span></div><span className="story-chip">3 people</span></div>
          <span className="story-arrow"><Icon name="arrow" size={16} /></span>
          <div className="story-stage story-stage-settle"><span className="story-label">03 / settle</span><div className="story-settle-icon"><Icon name="check" size={23} /></div><span className="story-chip">all even</span></div>
        </div>
        <div className="hero-note"><span className="hero-note-line" /> Built around InstaPay</div>
      </div>
      <div className="entry-card">
        <div className="entry-card-head"><span className="step-label">01 / 02</span><span className="entry-icon"><Icon name={mode === 'create' ? 'scan' : 'users'} size={19} /></span></div>
        <div className="mode-switch" role="tablist" aria-label="Room action">
          <button type="button" className={mode === 'create' ? 'active' : ''} onClick={() => setMode('create')} role="tab" aria-selected={mode === 'create'}>Start a split</button>
          <button type="button" className={mode === 'join' ? 'active' : ''} onClick={() => setMode('join')} role="tab" aria-selected={mode === 'join'}>Join a room</button>
        </div>
        {mode === 'create' ? <>
          <h2>Let’s get the table together.</h2>
          <p className="card-copy">Start a room and invite everyone with one simple code.</p>
        </> : <>
          <h2>Someone saved you a seat.</h2>
          <p className="card-copy">Enter the code your friend sent you to see the shared bill.</p>
        </>}
        <div className="form-stack">
          <div className="emoji-field"><span className="field-label">Profile picture</span><EmojiPicker value={form.emoji} onChange={(emoji) => setForm({ ...form, emoji })} /></div>
          {mode === 'create' && <label>What should we call you<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="e.g. Mina" /></label>}
          {mode === 'create' && <label>InstaPay shareable link<input value={form.instapayLink} onChange={(event) => setForm({ ...form, instapayLink: event.target.value.trim().slice(0, 200) })} placeholder="https://ipn.eg/S/..." autoCapitalize="none" autoCorrect="off" /></label>}
          {mode === 'join' && <label>Your name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="e.g. Omar" /></label>}
          {mode === 'join' && <label>Room code<input className="code-input" value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase().slice(0, 6) })} placeholder="A8K2QF" maxLength={6} /></label>}
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button type="button" className="button button-dark button-full" onClick={mode === 'create' ? onCreate : onJoin}>{mode === 'create' ? 'Create my room' : 'Enter the room'} <Icon name="arrow" size={17} /></button>
        <p className="privacy-note">Your details stay on this device for now.</p>
      </div>
    </section>
    <div className="welcome-foot"><span>01</span><span className="foot-rule" /><span>Scan · split · settle</span><span className="foot-right">A small tool for good nights</span></div>
  </main>;
}

function EmptyReceipt({ onUpload, onManualReceipt }) {
  return <div className="empty-receipt">
    <div className="empty-art"><span className="art-ring ring-one" /><span className="art-ring ring-two" /><span className="art-paper"><Icon name="receipt" size={36} /></span><span className="art-star">✦</span></div>
    <span className="section-kicker">Your first move</span>
    <h2>Put the receipt<br /><em>on the table.</em></h2>
    <p>Take a photo or choose one from your camera roll. We’ll pull out the items and numbers.</p>
    <div className="receipt-actions"><label className="button button-yellow upload-button"><Icon name="camera" size={18} /> Upload receipt<input type="file" accept="image/*,.txt" onChange={onUpload} /></label><button className="button button-quiet manual-receipt" onClick={onManualReceipt}>Enter items manually</button></div>
    <span className="supported">JPG, PNG or a clear screenshot</span>
  </div>;
}

function ReceiptEditor({ room, receipt, receiptImage, isParsing, viewerId, onUpload, onAnalyze, onManualReceipt, onItemChange, onFeeChange, onAddItem, onToggleAssignment }) {

  return <div className="receipt-column">
    <div className="content-heading"><div><span className="section-kicker">The shared receipt</span><h1>{receipt?.merchant || 'Add your receipt'}</h1></div>{receipt && <span className="receipt-date">{receipt.date}</span>}</div>
    {!receipt && !receiptImage && <EmptyReceipt onUpload={onUpload} onManualReceipt={onManualReceipt} />}
    {receiptImage && <div className={`receipt-photo ${isParsing ? 'is-parsing' : ''}`}><img src={receiptImage} alt="Uploaded receipt preview" /><div className="photo-overlay"><span>{isParsing ? 'Reading the receipt…' : 'Receipt photo'}</span>{isParsing && <span className="scan-line" />}</div></div>}
    {receiptImage && !receipt && !isParsing && <div className="analyze-banner"><div><span className="mini-icon"><Icon name="spark" size={16} /></span><div><strong>Ready when you are</strong><span>We found a receipt image. Let’s turn it into a split.</span></div></div><button className="button button-dark" onClick={onAnalyze}>Analyze receipt <Icon name="arrow" size={16} /></button></div>}
    {isParsing && <div className="parsing-card" role="status" aria-live="polite"><span className="loader" /><div><strong>Finding the details</strong><span>Looking for items, quantities, and totals…</span></div></div>}
    {receipt && !isParsing && <div className="receipt-panel">
      <div className="receipt-panel-top"><div><span className="section-kicker">Parsed details</span><h2>Receipt items <span>{receipt.items.length}</span></h2><p className="selection-hint">Tap “Add me” on the items you had.</p></div><label className="button button-quiet upload-again"><Icon name="camera" size={16} /> Replace<input type="file" accept="image/*,.txt" onChange={onUpload} /></label></div>
      <div className="item-list">{receipt.items.map((item) => <div className="item-row" key={item.id}><div className="item-qty"><input aria-label={`${item.name} quantity`} type="number" min="1" value={item.quantity} onChange={(event) => onItemChange(item.id, 'quantity', Math.max(1, Number(event.target.value)))} /></div><div className="item-name"><input aria-label={`${item.name} name`} value={item.name} onChange={(event) => onItemChange(item.id, 'name', event.target.value)} /><span className="item-assignee">{item.assignedTo?.length > 1 ? 'Shared' : room.participants.find((person) => person.id === item.assignedTo?.[0])?.name || 'Shared'}</span></div><div className="item-price"><span>EGP</span><input aria-label={`${item.name} price`} type="number" min="0" step="0.01" value={item.price} onChange={(event) => onItemChange(item.id, 'price', Math.max(0, Number(event.target.value)))} /></div><div className="assignment"><button type="button" className={`claim-item ${item.assignedTo?.includes(viewerId) ? 'is-claimed' : ''}`} onClick={() => onToggleAssignment(item.id, viewerId)} aria-pressed={item.assignedTo?.includes(viewerId)}><Icon name="check" size={13} />{item.assignedTo?.includes(viewerId) ? 'Added' : 'Add me'}</button></div></div>)}</div>
      <button type="button" className="add-item" onClick={onAddItem}><Icon name="plus" size={16} /> Add another item</button>
      <div className="fee-grid"><label>Subtotal<div className="read-value">{money(receipt.items.reduce((sum, item) => sum + item.price * item.quantity, 0))}</div></label><label>Tax<div className="money-input"><span>EGP</span><input type="number" min="0" step="0.01" value={receipt.tax} onChange={(event) => onFeeChange('tax', event.target.value)} /></div></label><label>Service<div className="money-input"><span>EGP</span><input type="number" min="0" step="0.01" value={receipt.service} onChange={(event) => onFeeChange('service', event.target.value)} /></div></label><label className="total-field">Total<div className="total-value">{money(calculateReceiptTotal(receipt))}</div></label></div>
    </div>}
  </div>;

}

function RoomSidebar({ room, shares, viewerId, onCopyInvite, copied, onAddParticipant, onMarkPaid, onResetPaid, onConfirmPaid, showAddPerson, setShowAddPerson, friends, onSaveFriend, onDeleteFriend, onAddFriendToRoom }) {
  const [newPerson, setNewPerson] = useState('');
  const [newPersonEmoji, setNewPersonEmoji] = useState(DEFAULT_EMOJIS[1]);
  const owner = room.participants.find((person) => person.id === room.ownerId);
  const viewer = room.participants.find((person) => person.id === viewerId);
  const viewerSettlementStatus = getSettlementStatus(viewer);
  const ownerInstapayLink = owner?.instapayLink || owner?.instapayUsername;
  return <aside className="room-sidebar" aria-label="Room details">
    <div className="invite-card"><div className="invite-top"><span className="section-kicker">Room invite</span><span className="live-dot">live</span></div><p>Send this code to your table so everyone can join.</p><button type="button" className={`invite-code ${copied ? 'is-copied' : ''}`} onClick={onCopyInvite} aria-label="Copy invite code"><span>{room.code.slice(0, 3)}</span><strong>{room.code.slice(3)}</strong><Icon name={copied ? 'check' : 'copy'} size={15} /></button><button type="button" className={`share-link ${copied ? 'is-copied' : ''}`} onClick={onCopyInvite} aria-live="polite"><Icon name={copied ? 'check' : 'share'} size={15} /> {copied ? 'Invite code copied' : 'Copy invite code'}</button></div>
    <div className="people-block"><div className="block-heading"><div><span className="section-kicker">At the table</span><h2>People <span>{room.participants.length}</span></h2></div><button type="button" className="icon-button" onClick={() => setShowAddPerson(!showAddPerson)} aria-label="Add friend" aria-expanded={showAddPerson}><Icon name="plus" size={18} /></button></div>
      {showAddPerson && <div className="add-person-form"><div className="add-person-main"><input autoFocus value={newPerson} onChange={(event) => setNewPerson(event.target.value)} placeholder="Friend's name" onKeyDown={(event) => { if (event.key === 'Enter' && newPerson.trim()) { onAddParticipant(newPerson, newPersonEmoji); setNewPerson(''); setShowAddPerson(false); } }} /><button type="button" onClick={() => { if (newPerson.trim()) { onAddParticipant(newPerson, newPersonEmoji); setNewPerson(''); setShowAddPerson(false); } }} aria-label="Save friend"><Icon name="check" size={16} /></button></div><EmojiPicker compact value={newPersonEmoji} onChange={setNewPersonEmoji} /></div>}
      <div className="people-list">{room.participants.map((person) => { const settlementStatus = getSettlementStatus(person); return <div className="person-row" key={person.id}><Avatar person={person} /><div><strong>{person.id === owner?.id ? 'You' : person.name}{settlementStatus === SETTLEMENT_STATUS.CONFIRMED && <span className="settled-check" title="Payment confirmed" aria-label="Payment confirmed"><Icon name="check" size={12} /></span>}</strong><span>{person.id === owner?.id ? 'Room host' : settlementStatus === SETTLEMENT_STATUS.MARKED_PAID ? 'Paid — waiting for host' : settlementStatus === SETTLEMENT_STATUS.CONFIRMED ? 'Payment confirmed' : 'Friend'}</span></div>{viewerId === room.ownerId && person.id !== room.ownerId && settlementStatus === SETTLEMENT_STATUS.MARKED_PAID && <button type="button" className="confirm-settlement" onClick={() => onConfirmPaid(person.id)}>Confirm payment</button>}{person.id === owner?.id && <span className="host-pill">host</span>}</div>; })}</div>
    </div>
    {room.receipt && <div className="you-owe"><div className="owe-heading"><span className="section-kicker">Your total</span><Icon name="spark" size={18} /></div><strong>{money(shares[viewerId]?.amount)}</strong><span>includes your share of tax & service</span><div className="owe-rule" /><div className="owe-breakdown"><span>Items <b>{money(shares[viewerId]?.items)}</b></span><span>Tax + service <b>{money((shares[viewerId]?.taxShare || 0) + (shares[viewerId]?.serviceShare || 0))}</b></span></div>{viewer?.id !== room.ownerId && viewerSettlementStatus === SETTLEMENT_STATUS.UNPAID && ownerInstapayLink && <a className="button button-dark button-full pay-host" href={buildInstapayLink(ownerInstapayLink)} target="_blank" rel="noreferrer"><Icon name="arrow" size={16} /> Pay the host</a>}{viewer?.id !== room.ownerId && viewerSettlementStatus === SETTLEMENT_STATUS.UNPAID && <button className="button button-yellow button-full settle-button" onClick={onMarkPaid}><Icon name="check" size={16} /> I've paid</button>}{viewer?.id !== room.ownerId && viewerSettlementStatus === SETTLEMENT_STATUS.MARKED_PAID && <><span className="settlement-note">Payment marked. Waiting for the host to confirm.</span><button className="button button-quiet button-full settle-button" onClick={onResetPaid}>Undo paid</button></>}{viewer?.id !== room.ownerId && viewerSettlementStatus === SETTLEMENT_STATUS.CONFIRMED && <span className="settlement-note settlement-confirmed">Payment confirmed by the host.</span>}</div>}
    <FriendsPanel friends={friends} room={room} onSave={onSaveFriend} onDelete={onDeleteFriend} onAddToRoom={onAddFriendToRoom} />
  </aside>;
}

function FriendsPanel({ friends, room, onSave, onDelete, onAddToRoom }) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', instapayLink: '' });
  const [formError, setFormError] = useState('');

  const resetForm = () => { setForm({ name: '', instapayLink: '' }); setFormError(''); setEditingId(null); setShowForm(false); };
  const startEdit = (friend) => { setForm({ name: friend.name, instapayLink: friend.instapayLink }); setFormError(''); setEditingId(friend.id); setShowForm(true); };
  const submit = () => {
    const name = form.name.trim();
    const instapayLink = form.instapayLink.trim();
    if (!name || !instapayLink) return setFormError('Add your friend’s name and InstaPay shareable link.');
    if (!isValidInstapayLink(instapayLink)) return setFormError('Enter a valid InstaPay shareable link.');
    onSave({ name, instapayLink }, editingId);
    resetForm();
  };

  return <section className="friends-panel" aria-labelledby="friends-heading">
    <div className="friends-panel-head"><div><span className="section-kicker">Your local list</span><h2 id="friends-heading">Friends <span>{friends.length}</span></h2></div><button type="button" className="icon-button" onClick={() => showForm ? resetForm() : setShowForm(true)} aria-label={showForm ? 'Close friend form' : 'Add saved friend'} aria-expanded={showForm}><Icon name="plus" size={18} /></button></div>
    {showForm && <form className="friend-form" onSubmit={(event) => { event.preventDefault(); submit(); }} aria-label={editingId ? 'Edit saved friend' : 'Add saved friend'}><label>Name<input autoFocus value={form.name} onChange={(event) => { setForm({ ...form, name: event.target.value }); setFormError(''); }} placeholder="Friend's name" /></label><label>InstaPay link<input value={form.instapayLink} onChange={(event) => { setForm({ ...form, instapayLink: event.target.value.trim().slice(0, 200) }); setFormError(''); }} placeholder="https://ipn.eg/S/..." autoCapitalize="none" autoCorrect="off" aria-describedby={formError ? 'friend-form-error' : undefined} aria-invalid={Boolean(formError)} /></label>{formError && <p id="friend-form-error" className="form-error" role="alert">{formError}</p>}<div className="friend-form-actions"><button type="submit" className="button button-dark button-full">{editingId ? 'Save changes' : 'Save friend'}</button><button type="button" className="button button-quiet" onClick={resetForm}>Cancel</button></div></form>}
    {friends.length ? <div className="friend-list">{friends.map((friend) => { const added = room.participants.some((person) => person.name === friend.name && (person.instapayLink || person.instapayUsername) === friend.instapayLink); return <div className="friend-row" key={friend.id}><Avatar person={friend} small /><div className="friend-details"><strong>{friend.name}</strong><span title={friend.instapayLink}>{friend.instapayLink}</span></div><div className="friend-actions"><button type="button" className="friend-add" onClick={() => onAddToRoom(friend)} disabled={added}>{added ? 'In room' : 'Add to room'}</button><button type="button" className="friend-icon" onClick={() => startEdit(friend)} aria-label={`Edit ${friend.name}`}><Icon name="edit" size={14} /></button><button type="button" className="friend-icon" onClick={() => { onDelete(friend.id); if (editingId === friend.id) resetForm(); }} aria-label={`Delete ${friend.name}`}><Icon name="trash" size={14} /></button></div></div>; })}</div> : <p className="friend-empty">Save people you split with often. They stay on this device only.</p>}
  </section>;
}

function RoomView({ state, onLogout, onUpload, onAnalyze, onManualReceipt, isParsing, receiptImage, onItemChange, onFeeChange, onAddItem, onToggleAssignment, onCopyInvite, copied, onAddParticipant, onMarkPaid, onResetPaid, onConfirmPaid, onSaveFriend, onDeleteFriend, onAddFriendToRoom, syncError }) {
  const { room, profile } = state;
  const [showAddPerson, setShowAddPerson] = useState(false);
  const shares = useMemo(() => calculateShares(room.receipt, room.participants.map((person) => person.id)), [room.receipt, room.participants]);
  const viewer = room.participants.find((person) => person.id === profile.id) || room.participants.find((person) => person.name === profile.name) || room.participants[0];
  return <main className="room-page">

    <header className="app-header"><Brand /><div className="header-room"><span className="status-dot" /> Room <strong>{room.code}</strong>{syncError && <span className="sync-error" role="status">{syncError}</span>}</div><div className="header-actions"><button className="header-link" onClick={onLogout}>Leave room</button><Avatar person={viewer} small /></div></header>

    <div className="room-layout"><ReceiptEditor room={room} receipt={room.receipt} receiptImage={receiptImage} isParsing={isParsing} viewerId={viewer.id} onUpload={onUpload} onAnalyze={onAnalyze} onManualReceipt={onManualReceipt} onItemChange={onItemChange} onFeeChange={onFeeChange} onAddItem={onAddItem} onToggleAssignment={onToggleAssignment} /><RoomSidebar room={room} shares={shares} viewerId={viewer.id} onCopyInvite={onCopyInvite} copied={copied} onAddParticipant={onAddParticipant} onMarkPaid={() => onMarkPaid(viewer.id)} onResetPaid={() => onResetPaid(viewer.id)} onConfirmPaid={onConfirmPaid} showAddPerson={showAddPerson} setShowAddPerson={setShowAddPerson} friends={state.friends} onSaveFriend={onSaveFriend} onDeleteFriend={onDeleteFriend} onAddFriendToRoom={onAddFriendToRoom} /></div>
    <footer className="room-footer"><span><span className="footer-mark">✦</span> SplitShare</span><span>Fair shares, good company.</span></footer>
  </main>;
}

export default function App() {
  const [state, setState] = useState(() => getStoredState());
  const [mode, setMode] = useState('create');
  const [form, setForm] = useState(() => { const profile = getStoredState().profile; return { name: profile?.name || '', instapayLink: profile?.instapayLink || profile?.instapayUsername || '', code: '', emoji: profile?.emoji || DEFAULT_EMOJIS[0] }; });
  const [error, setError] = useState('');
  const [receiptImage, setReceiptImage] = useState('');
  const [pendingFile, setPendingFile] = useState(null);
  const [isParsing, setIsParsing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [syncError, setSyncError] = useState('');
  const stateRef = useRef(state);
  const syncQueueRef = useRef(Promise.resolve());
  const dirtyRoomRef = useRef(null);
  const syncRetryRef = useRef(null);
  const syncErrorMessage = (error) => error?.status === 404 ? 'Room not found on sync server.' : 'Sync server unavailable.';

  useEffect(() => { stateRef.current = state; }, [state]);

  useEffect(() => {
    const code = state.room?.code;
    if (!code) return undefined;
    let active = true;
    const pullRoom = async () => {
      if (dirtyRoomRef.current) return;
      try {
        const room = await getRemoteRoom(code);
        if (!active || dirtyRoomRef.current || stateRef.current.room?.code !== code) return;
        if (JSON.stringify(room) !== JSON.stringify(stateRef.current.room)) {
          const next = { ...stateRef.current, room };
          stateRef.current = next;
          setState(next);
          saveStoredState(next);
        }
        setSyncError('');
      } catch (error) {
        if (active) setSyncError(syncErrorMessage(error));
      }
    };
    pullRoom();
    const timer = setInterval(pullRoom, 2000);
    return () => { active = false; clearInterval(timer); };
  }, [state.room?.code]);

  const queueRemoteRoom = (room) => {
    dirtyRoomRef.current = room;
    const request = syncQueueRef.current.then(() => updateRemoteRoom(room));
    syncQueueRef.current = request.catch(() => {});
    request.then(() => {
      if (JSON.stringify(dirtyRoomRef.current) === JSON.stringify(room)) {
        dirtyRoomRef.current = null;
        if (syncRetryRef.current) clearTimeout(syncRetryRef.current);
        syncRetryRef.current = null;
      }
      setSyncError('');
    }, (error) => {
      const isCurrentRoom = JSON.stringify(dirtyRoomRef.current) === JSON.stringify(room);
      setSyncError(syncErrorMessage(error));
      if (error?.status === 404) {
        if (isCurrentRoom) dirtyRoomRef.current = null;
        return;
      }
      if (JSON.stringify(dirtyRoomRef.current) === JSON.stringify(room) && !syncRetryRef.current) {
        syncRetryRef.current = setTimeout(() => {
          syncRetryRef.current = null;
          if (JSON.stringify(dirtyRoomRef.current) === JSON.stringify(room)) queueRemoteRoom(room);
        }, 2000);
      }
    });
  };

  const updateRoom = (updater) => {
    const next = { ...stateRef.current, room: updater(stateRef.current.room) };
    stateRef.current = next;
    saveStoredState(next);
    setState(next);
    queueRemoteRoom(next.room);
  };

  const updateFriends = (friends) => {
    const next = { ...stateRef.current, friends };
    stateRef.current = next;
    saveStoredState(next);
    setState(next);
  };

  const handleCreate = async () => {
    if (!form.name.trim() || !form.instapayLink.trim()) return setError('Add your name and InstaPay shareable link to continue.');
    let link;
    try { const url = new URL(form.instapayLink.trim()); if (!isValidInstapayLink(form.instapayLink)) throw new Error(); link = url.href; } catch { return setError('Enter a valid InstaPay shareable link.'); }
    const profile = { name: form.name.trim(), instapayLink: link, emoji: form.emoji };
    const savedState = { ...stateRef.current, profile };
    stateRef.current = savedState;
    saveStoredState(savedState);
    try {
      const room = await createRemoteRoom(createRoom(profile));
      const nextState = { ...stateRef.current, profile: { ...profile, id: room.ownerId }, room };
      stateRef.current = nextState;
      saveStoredState(nextState);
      setState(nextState);
    } catch {
      setError('Could not reach the sync server. Start it and try again.');
    }
  };

  const handleJoin = async () => {
    if (!form.name.trim() || form.code.length !== 6) return setError('Add your name and the six-character room code.');
    const profile = { name: form.name.trim(), instapayLink: stateRef.current.profile?.instapayLink || '', emoji: form.emoji };
    try {
      const room = await getRemoteRoom(form.code.toUpperCase());
      const joinedRoom = joinRoom(room, profile);
      const nextState = { ...stateRef.current, profile: { ...profile, id: joinedRoom.participants.at(-1).id }, room: await updateRemoteRoom(joinedRoom) };
      stateRef.current = nextState;
      saveStoredState(nextState);
      setState(nextState);
    } catch (error) {
      setError(error.message === 'Room not found.' ? 'That room code does not exist.' : 'Could not reach the sync server. Try again.');
    }
  };

  const handleUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    const reader = new FileReader();
    reader.onload = () => setReceiptImage(reader.result);
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    setIsParsing(true);
    let text = pendingFile?.type === 'text/plain' ? await pendingFile.text() : '';
    if (pendingFile?.type.startsWith('image/')) {
      try {
        const worker = await createWorker('eng');
        const result = await worker.recognize(pendingFile);
        text = result.data.text;
        await worker.terminate();
      } catch {
        text = '';
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 350));
    const receipt = parseReceiptText(text);
    updateRoom((room) => ({ ...room, receipt }));
    setIsParsing(false);
  };

  const updateReceipt = (updater) => updateRoom((room) => ({ ...room, receipt: updater(room.receipt) }));
  const handleItemChange = (id, key, value) => updateReceipt((receipt) => ({ ...receipt, items: receipt.items.map((item) => item.id === id ? { ...item, [key]: value } : item) }));
  const handleFeeChange = (key, value) => updateReceipt((receipt) => ({ ...receipt, [key]: Math.max(0, Number(value)) }));
  const handleManualReceipt = () => { setReceiptImage(''); setPendingFile(null); updateRoom((room) => ({ ...room, receipt: { merchant: 'Manual receipt', date: 'Today', items: [], subtotal: 0, tax: 0, service: 0, total: 0 } })); };
  const handleAddItem = () => updateReceipt((receipt) => ({ ...receipt, items: [...receipt.items, { id: `item-${Date.now()}`, name: '', quantity: 1, price: 0, assignedTo: [] }] }));
  const handleToggleAssignment = (id, participantId) => updateReceipt((receipt) => ({ ...receipt, items: receipt.items.map((item) => {
    if (item.id !== id) return item;
    const assignedTo = item.assignedTo?.length ? item.assignedTo : [];
    return { ...item, assignedTo: assignedTo.includes(participantId) ? assignedTo.filter((id) => id !== participantId) : [...assignedTo, participantId] };
  }) }));
  const handleMarkPaid = (participantId) => updateRoom((room) => markParticipantPaid(room, participantId));
  const handleResetPaid = (participantId) => updateRoom((room) => resetParticipantPaid(room, participantId));
  const handleConfirmPaid = (participantId) => { if (stateRef.current.room?.ownerId !== stateRef.current.profile?.id) return; updateRoom((room) => confirmParticipantPaid(room, participantId)); };
  const handleCopyInvite = async () => { try { if (!navigator.clipboard) return; await navigator.clipboard.writeText(state.room.code); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* clipboard is optional in local previews */ } };
  const handleAddParticipant = (name, emoji) => updateRoom((room) => joinRoom(room, { name, instapayLink: '', emoji }));
  const handleSaveFriend = (friend, friendId) => updateFriends(friendId ? updateFriend(stateRef.current.friends, friendId, friend) : [...stateRef.current.friends, createFriend(friend)]);
  const handleDeleteFriend = (friendId) => updateFriends(removeFriend(stateRef.current.friends, friendId));
  const handleAddFriendToRoom = (friend) => updateRoom((room) => joinRoom(room, friend));
  const handleLogout = () => { const cleared = { ...stateRef.current, room: null }; dirtyRoomRef.current = null; if (syncRetryRef.current) clearTimeout(syncRetryRef.current); syncRetryRef.current = null; stateRef.current = cleared; saveStoredState(cleared); setState(cleared); setSyncError(''); setReceiptImage(''); setPendingFile(null); setCopied(false); setForm({ name: cleared.profile?.name || '', instapayLink: cleared.profile?.instapayLink || '', code: '', emoji: cleared.profile?.emoji || DEFAULT_EMOJIS[0] }); };

  if (!state.profile || !state.room) return <Welcome mode={mode} setMode={(nextMode) => { setMode(nextMode); setError(''); }} form={form} setForm={setForm} onCreate={handleCreate} onJoin={handleJoin} error={error} />;
  return <RoomView state={state} onLogout={handleLogout} onUpload={handleUpload} onAnalyze={handleAnalyze} onManualReceipt={handleManualReceipt} isParsing={isParsing} receiptImage={receiptImage} onItemChange={handleItemChange} onFeeChange={handleFeeChange} onAddItem={handleAddItem} onToggleAssignment={handleToggleAssignment} onCopyInvite={handleCopyInvite} copied={copied} onAddParticipant={handleAddParticipant} onMarkPaid={handleMarkPaid} onResetPaid={handleResetPaid} onConfirmPaid={handleConfirmPaid} onSaveFriend={handleSaveFriend} onDeleteFriend={handleDeleteFriend} onAddFriendToRoom={handleAddFriendToRoom} syncError={syncError} />;
}
