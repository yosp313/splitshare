const API_BASE = import.meta.env.VITE_API_BASE || '';

function buildUrl(path) {
  return API_BASE ? `${API_BASE.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}` : path;
}

async function request(path, options = {}) {
  const response = await fetch(buildUrl(path), {
    ...options,
    headers: { 'content-type': 'application/json', ...options.headers },
  });
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.error || 'Sync request failed.');
    error.status = response.status;
    throw error;
  }
  return data.room;
}

export function createRemoteRoom(room) {
  return request('/api/rooms', { method: 'POST', body: JSON.stringify({ room }) });
}

export function getRemoteRoom(code) {
  return request(`/api/rooms/${code}`);
}

export function updateRemoteRoom(room) {
  return request(`/api/rooms/${room.code}`, { method: 'PUT', body: JSON.stringify({ room }) });
}

export function subscribeToRoom(code, handlers = {}) {
  if (typeof EventSource === 'undefined') throw new Error('EventSource is unavailable.');
  const source = new EventSource(buildUrl(`/api/rooms/${code}/events`));
  let closed = false;
  source.addEventListener('room', (event) => {
    try {
      handlers.onRoom?.(JSON.parse(event.data).room);
    } catch (error) {
      handlers.onError?.(error);
    }
  });
  source.onopen = () => handlers.onOpen?.();
  source.onerror = (error) => handlers.onError?.(error);
  return () => {
    if (closed) return;
    closed = true;
    source.close();
  };
}
