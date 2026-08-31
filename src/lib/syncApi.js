async function request(path, options = {}) {
  const response = await fetch(path, {
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
