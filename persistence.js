import { seed } from './seed.js';
import { snapshot } from './sprintLogic.js';
import { validateState, sanitizeState } from './validation.js';

// Storage adapter: Express API when it is running, otherwise localStorage.
// All data read back is validated, so corrupted / tampered data can never crash the UI.
export const KEY = 'cardcascade.v1';

export async function loadState() {
  let notice = null;
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 1500);
    const r = await fetch('/api/state', { signal: ctl.signal });
    clearTimeout(t);
    if (r.ok) {
      const s = await r.json();
      const v = validateState(s);
      if (v.ok) return { state: sanitizeState(s), source: 'server', notice };
      notice = 'Server data was invalid, using local data instead.';
    }
  } catch (e) { /* server not running: use localStorage */ }

  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const v = validateState(JSON.parse(raw));
      if (v.ok) return { state: sanitizeState(JSON.parse(raw)), source: 'local', notice };
      notice = 'Saved data was corrupted, so the sample sprint was restored.';
    }
  } catch (e) {
    notice = 'Saved data could not be read, so the sample sprint was restored.';
  }
  const s = seed();
  snapshot(s);
  return { state: s, source: 'local', notice };
}

let timer;
// onStatus(status, message): 'local' | 'synced' | 'offline' | 'error'
export function saveState(state, source, onStatus) {
  let localOk = true;
  try { localStorage.setItem(KEY, JSON.stringify(state)); }
  catch (e) { localOk = false; onStatus('error', 'Could not save in this browser (storage full or blocked).'); }
  if (source !== 'server') { if (localOk) onStatus('local'); return; }
  clearTimeout(timer);
  timer = setTimeout(async () => {
    try {
      const r = await fetch('/api/state', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(state) });
      if (r.ok) return onStatus('synced');
      let msg = 'The server rejected the update';
      try { const j = await r.json(); msg += ': ' + ((j.details && j.details[0]) || j.error); } catch (e) {}
      onStatus('error', msg);
    } catch (e) {
      onStatus('offline', 'Server unreachable. Changes are saved in this browser.');
    }
  }, 250);
}
