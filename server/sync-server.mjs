import { createServer } from 'node:http';
import { mkdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { dirname, join, resolve, normalize, extname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const MAX_BODY_SIZE = 50_000;
const ROOM_TTL_MS = 48 * 60 * 60 * 1000;
const RATE_WINDOW_MS = 60_000;
const RATE_MAX_WRITES = 60;
const RATE_MAX_ROOM_WRITES = 30;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';
const writeHits = new Map();
const roomWriteHits = new Map();

function getClientIp(request) {
  const forwarded = request.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded) return forwarded.split(',')[0].trim();
  return request.socket?.remoteAddress || 'unknown';
}

function checkRateLimit(ip, roomCode = '') {
  const now = Date.now();
  const hits = (writeHits.get(ip) || []).filter((time) => now - time < RATE_WINDOW_MS);
  hits.push(now);
  writeHits.set(ip, hits);
  if (hits.length > RATE_MAX_WRITES) throw new HttpError(429, 'Too many requests. Try again shortly.');
  if (roomCode) {
    const roomHits = (roomWriteHits.get(roomCode) || []).filter((time) => now - time < RATE_WINDOW_MS);
    roomHits.push(now);
    roomWriteHits.set(roomCode, roomHits);
    if (roomHits.length > RATE_MAX_ROOM_WRITES) throw new HttpError(429, 'Room is being updated too often. Try again shortly.');
  }
}

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
  if (room.participants.length > 30) throw new HttpError(400, 'Room is full.');
  if ((room.receipt?.items || []).length > 100) throw new HttpError(400, 'Too many receipt items.');
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
    'access-control-allow-origin': ALLOWED_ORIGIN,
    'content-type': 'application/json; charset=utf-8',
  });
  response.end(JSON.stringify(value));
}

function instrumentRequest(request, response) {
  const started = Date.now();
  const path = new URL(request.url, 'http://localhost').pathname;
  const originalEnd = response.end.bind(response);
  response.end = (...args) => {
    console.log(JSON.stringify({ time: new Date().toISOString(), method: request.method, path, status: response.statusCode, ms: Date.now() - started, ip: getClientIp(request) }));
    return originalEnd(...args);
  };
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
  const findRoom = db.prepare('SELECT state, updated_at FROM rooms WHERE code = ?');
  const replaceRoom = db.prepare('UPDATE rooms SET state = ?, updated_at = ? WHERE code = ?');
  const pruneRooms = db.prepare('DELETE FROM rooms WHERE updated_at < ?');
  const subscribers = new Map();
  pruneRooms.run(Date.now() - ROOM_TTL_MS);
  const pruneTimer = setInterval(() => { try { pruneRooms.run(Date.now() - ROOM_TTL_MS); } catch {} }, 60 * 60 * 1000);
  if (pruneTimer.unref) pruneTimer.unref();

  const removeSubscriber = (code, response, heartbeat) => {
    clearInterval(heartbeat);
    const roomSubscribers = subscribers.get(code);
    roomSubscribers?.delete(response);
    if (roomSubscribers?.size === 0) subscribers.delete(code);
  };

  const broadcastRoom = (room) => {
    for (const response of subscribers.get(room.code) || []) {
      try {
        response.write(`event: room\ndata: ${JSON.stringify({ room })}\n\n`);
      } catch {
        response.destroy();
      }
    }
  };

  const server = createServer(async (request, response) => {
    instrumentRequest(request, response);
    response.setHeader('access-control-allow-origin', ALLOWED_ORIGIN);
    response.setHeader('access-control-allow-headers', 'content-type');
    response.setHeader('access-control-allow-methods', 'GET, POST, PUT, OPTIONS');
    if (request.method === 'OPTIONS') return response.writeHead(204).end();

    const url = new URL(request.url, 'http://localhost');
    if (url.pathname === '/healthz' && request.method === 'GET') {
      try {
        db.prepare('SELECT 1').get();
        return sendJson(response, 200, { ok: true });
      } catch {
        return sendJson(response, 503, { ok: false, error: 'Database unavailable.' });
      }
    }
    if (url.pathname === '/api/client-errors' && request.method === 'POST') {
      try {
        checkRateLimit(getClientIp(request));
        const body = String(await readBody(request)).slice(0, 2000);
        console.log(JSON.stringify({ time: new Date().toISOString(), level: 'client-error', ip: getClientIp(request), body }));
      } catch {}
      response.writeHead(204).end();
      return;
    }
    const eventsMatch = url.pathname.match(/^\/api\/rooms\/([A-Z0-9]{6})\/events$/);
    const match = url.pathname.match(/^\/api\/rooms(?:\/([A-Z0-9]{6}))?$/);
    if (!match && !eventsMatch) {
      if (request.method === 'GET') return serveStatic(url.pathname, response);
      return sendJson(response, 404, { error: 'Not found.' });
    }

    try {
      if (request.method === 'GET' && eventsMatch) {
        const row = findRoom.get(eventsMatch[1]);
        if (!row) return sendJson(response, 404, { error: 'Room not found.' });
        const room = JSON.parse(row.state);
        response.writeHead(200, {
          'cache-control': 'no-cache, no-transform',
          'connection': 'keep-alive',
          'content-type': 'text/event-stream; charset=utf-8',
          'x-accel-buffering': 'no',
        });
        response.write(': connected\n\n');
        response.write(`event: room\ndata: ${JSON.stringify({ room })}\n\n`);
        const roomSubscribers = subscribers.get(eventsMatch[1]) || new Set();
        subscribers.set(eventsMatch[1], roomSubscribers);
        roomSubscribers.add(response);
        const heartbeat = setInterval(() => response.write(': heartbeat\n\n'), 25000);
        response.on('close', () => removeSubscriber(eventsMatch[1], response, heartbeat));
        return;
      }
      if (eventsMatch) return sendJson(response, 405, { error: 'Method not allowed.' });

      if (request.method === 'POST' && !match[1]) {
        const room = parseRoomBody(await readBody(request));
        checkRateLimit(getClientIp(request), room.code);
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
        if (Date.now() - row.updated_at > ROOM_TTL_MS) return sendJson(response, 410, { error: 'Room expired.' });
        return sendJson(response, 200, { room: JSON.parse(row.state) });
      }

      if (request.method === 'PUT' && match[1]) {
        const room = parseRoomBody(await readBody(request));
        checkRateLimit(getClientIp(request), room.code);
        if (room.code !== match[1]) throw new HttpError(400, 'Room code does not match the URL.');
        const result = replaceRoom.run(JSON.stringify(room), Date.now(), match[1]);
        if (!result.changes) return sendJson(response, 404, { error: 'Room not found.' });
        broadcastRoom(room);
        return sendJson(response, 200, { room });
      }

      return sendJson(response, 405, { error: 'Method not allowed.' });
    } catch (error) {
      const status = error instanceof HttpError ? error.status : 500;
      return sendJson(response, status, { error: status === 500 ? 'Server error.' : error.message });
    }
  });

  return { server, close: () => {
    clearInterval(pruneTimer);
    for (const [code, roomSubscribers] of subscribers) {
      for (const response of roomSubscribers) response.end();
      subscribers.delete(code);
    }
    server.close();
    db.close();
  } };
}

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon' };

function serveStatic(pathname, response) {
  const dist = join(process.cwd(), 'dist');
  const safe = normalize(pathname).replace(/^(\.\.[/\\])+/, '');
  const file = join(dist, safe === '/' ? 'index.html' : safe.slice(1));
  const fallback = join(dist, 'index.html');
  const target = existsSync(file) && statSync(file).isFile() ? file : fallback;
  if (!existsSync(target)) return sendJson(response, 404, { error: 'Not found.' });
  response.writeHead(200, { 'content-type': MIME[extname(target)] || 'application/octet-stream', 'cache-control': target.endsWith('index.html') ? 'no-cache' : 'public, max-age=31536000, immutable' });
  response.end(readFileSync(target));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const { server, close } = createSyncServer();
  const port = Number(process.env.PORT || 3001);
  server.listen(port, () => console.log(`SplitShare sync server listening on ${port}`));
  process.on('SIGINT', () => { close(); process.exit(0); });
}
