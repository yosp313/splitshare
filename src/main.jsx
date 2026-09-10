import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { ThemeProvider } from './contexts/ThemeContext.jsx';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <ThemeProvider>
    <App />
  </ThemeProvider>
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js'));
}

window.addEventListener('error', (event) => {
  try {
    const body = JSON.stringify({ message: String(event.message || 'unknown').slice(0, 300), source: String(event.filename || '').slice(0, 200) });
    if (navigator.sendBeacon) navigator.sendBeacon('/api/client-errors', body);
  } catch {}
});
