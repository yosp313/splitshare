import { createServer } from 'node:http';
import { mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const MAX_BODY_SIZE = 1_000_000;

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function validateRoom(room) {
  if (!room || typeof room !== 'object' || !/^[A-Z0-9]{6}$/.test(room.code)) {
    throw new HttpError(400, 'Room code must be six uppercase letters or numbers.');
  }
  if (!Array.isArray(room.participants) || typeof room.ownerId !== 'string') {
    throw new HttpError(400, 'Room must include participants and an owner.');
  }
  return room;
}

function readBody(request) {
  return new Promise((resolveBody, reject) => {
    let body = '';
    request.setEncoding('utf8');
    request.on('data', (chunk) => {
      body += chunk;
      if (body.length > MAX_BODY_SIZE) reject(new HttpError(413, 'Request body is too large.'));
    });
    request.on('end', () => resolveBody(body));
    request.on('error', reject);
  });
}

function sendJson(response, status, value) {
  response.writeHead(status, {
    'access-control-allow-origin': '*',
    'content-type': 'application/json; charset=utf-8',
  });
  response.end(JSON.stringify(value));
}

function parseRoomBody(body) {
  try {
    return validateRoom(JSON.parse(body).room);
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, 'Request body must contain a valid room JSON object.');
  }
}

export function createSyncServer({ dbPath = join(process.cwd(), 'data', 'splitshare.sqlite') } = {}) {
  mkdirSync(dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS rooms (
      code TEXT PRIMARY KEY,
      state TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    ) STRICT
  `);

  const insertRoom = db.prepare('INSERT INTO rooms (code, state, updated_at) VALUES (?, ?, ?)');
  const findRoom = db.prepare('SELECT state FROM rooms WHERE code = ?');
  const replaceRoom = db.prepare('UPDATE rooms SET state = ?, updated_at = ? WHERE code = ?');

  const server = createServer(async (request, response) => {
    response.setHeader('access-control-allow-origin', '*');
    response.setHeader('access-control-allow-headers', 'content-type');
    response.setHeader('access-control-allow-methods', 'GET, POST, PUT, OPTIONS');
    if (request.method === 'OPTIONS') return response.writeHead(204).end();

    const url = new URL(request.url, 'http://localhost');
    const match = url.pathname.match(/^\/api\/rooms(?:\/([A-Z0-9]{6}))?$/);
    if (!match) return sendJson(response, 404, { error: 'Not found.' });

    try {
      if (request.method === 'POST' && !match[1]) {
        const room = parseRoomBody(await readBody(request));
        try {
          insertRoom.run(room.code, JSON.stringify(room), Date.now());
        } catch (error) {
          if (String(error.message).includes('UNIQUE')) throw new HttpError(409, 'Room already exists.');
          throw error;
        }
        return sendJson(response, 201, { room });
      }

      if (request.method === 'GET' && match[1]) {
        const row = findRoom.get(match[1]);
        if (!row) return sendJson(response, 404, { error: 'Room not found.' });
        return sendJson(response, 200, { room: JSON.parse(row.state) });
      }

      if (request.method === 'PUT' && match[1]) {
        const room = parseRoomBody(await readBody(request));
        if (room.code !== match[1]) throw new HttpError(400, 'Room code does not match the URL.');
        const result = replaceRoom.run(JSON.stringify(room), Date.now(), match[1]);
        if (!result.changes) return sendJson(response, 404, { error: 'Room not found.' });
        return sendJson(response, 200, { room });
      }

      return sendJson(response, 405, { error: 'Method not allowed.' });
    } catch (error) {
      const status = error instanceof HttpError ? error.status : 500;
      return sendJson(response, status, { error: status === 500 ? 'Server error.' : error.message });
    }
  });

  return { server, close: () => { server.close(); db.close(); } };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const { server, close } = createSyncServer();
  const port = Number(process.env.PORT || 3001);
  server.listen(port, () => console.log(`SplitShare sync server listening on ${port}`));
  process.on('SIGINT', () => { close(); process.exit(0); });
}
