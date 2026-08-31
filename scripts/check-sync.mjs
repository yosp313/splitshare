import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createSyncServer } from '../server/sync-server.mjs';

const directory = mkdtempSync(join(tmpdir(), 'splitshare-sync-'));
const { server, close } = createSyncServer({ dbPath: join(directory, 'rooms.sqlite') });
await new Promise((resolve) => server.listen(0, resolve));
const { port } = server.address();
const url = `http://127.0.0.1:${port}`;
const room = { code: 'A8K2QF', ownerId: 'owner-1', participants: [{ id: 'owner-1', name: 'Mina' }], receipt: null };
let eventReader;

async function readUntil(reader, marker) {
  let text = '';
  while (!text.includes(marker)) {
    const result = await Promise.race([
      reader.read(),
      new Promise((_, reject) => setTimeout(() => reject(new Error(`Timed out waiting for SSE event: ${marker}`)), 3000)),
    ]);
    if (result.done) throw new Error('SSE stream closed before the expected event.');
    text += new TextDecoder().decode(result.value);
  }
  return text;
}

try {
  let response = await fetch(`${url}/api/rooms`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ room }) });
  assert.equal(response.status, 201);
  assert.deepEqual((await response.json()).room, room);

  response = await fetch(`${url}/api/rooms/${room.code}`);
  assert.deepEqual((await response.json()).room, room);

  response = await fetch(`${url}/api/rooms/${room.code}/events`);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /^text\/event-stream/);
  assert.match(response.headers.get('cache-control'), /no-cache/);
  assert.equal(response.headers.get('access-control-allow-origin'), '*');
  eventReader = response.body.getReader();
  const initialEvent = await readUntil(eventReader, `"code":"${room.code}"`);
  assert.match(initialEvent, /event: room\n/);

  const updated = { ...room, receipt: { merchant: 'Table', items: [], tax: 0, service: 0 } };
  response = await fetch(`${url}/api/rooms/${room.code}`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ room: updated }) });
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).room, updated);
  const pushedEvent = await readUntil(eventReader, '"merchant":"Table"');
  assert.match(pushedEvent, /event: room\n/);

  response = await fetch(`${url}/api/rooms/${room.code}`);
  assert.deepEqual((await response.json()).room, updated);

  response = await fetch(`${url}/api/rooms`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ room: { ...room, code: 'bad' } }) });
  assert.equal(response.status, 400);
  response = await fetch(`${url}/api/rooms/ZZZZZZ`);
  assert.equal(response.status, 404);

  console.log('sync checks passed: SQLite persisted room state');
  console.log('api checks passed: create, get, update, validation, and 404');
} finally {
  await eventReader?.cancel();
  close();
  rmSync(directory, { recursive: true, force: true });
}
