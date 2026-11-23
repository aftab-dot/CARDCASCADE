import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import * as L from '../lib/sprintLogic.js';
import { seed } from '../lib/seed.js';
import { loadState, saveState } from '../lib/persistence.js';
import { sanitizeState, validateCardInput, validateRetroText, validateSprintInput, validateState } from '../lib/validation.js';

const BoardContext = createContext(null);
export const useBoard = () => useContext(BoardContext);
const UNDO_LIMIT = 30;

export function BoardProvider({ children }) {
  const [state, setState] = useState(null);
  const [source, setSource] = useState('local');
  const [sync, setSync] = useState({ status: 'local', message: '' });
  const [draggingCardId, setDraggingCardId] = useState(null); // drag state shared by cards & columns
  const [filters, setFilters] = useState({ q: '', assignees: [], tag: '' });
  const [toast, setToast] = useState(null);
  const [undoDepth, setUndoDepth] = useState(0);
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || 'dark');
  const ref = useRef(null);
  const past = useRef([]);
  ref.current = state;

  const notify = useCallback((msg, kind = '') => setToast({ msg, kind, id: Date.now() }), []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3600);
    return () => clearTimeout(t);
  }, [toast]);

  // initial load (server API if running, else localStorage)
  useEffect(() => {
    let alive = true;
    loadState().then(({ state: s, source: src, notice }) => {
      if (!alive) return;
      L.snapshot(s);
      setState(s); setSource(src);
      if (notice) notify(notice, 'warn');
    });
    return () => { alive = false; };
  }, [notify]);

  // persist on every change; surface failures to the user (only when the status changes)
  const lastStatus = useRef('local');
  useEffect(() => {
    if (!state) return;
    saveState(state, source, (status, message = '') => {
      setSync({ status, message });
      if ((status === 'error' || status === 'offline') && lastStatus.current !== status) notify(message, 'warn');
      lastStatus.current = status;
    });
  }, [state, source, notify]);

  // theme → <html data-theme> + localStorage
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('cc.theme', theme); } catch (e) {}
  }, [theme]);

  // global error handling: nothing fails silently
  useEffect(() => {
    const benign = (m) => String(m || '').startsWith('ResizeObserver');
    const onError = (e) => { if (!benign(e.message)) notify('Unexpected error: ' + (e.message || 'see console'), 'warn'); };
    const onRejection = (e) => notify('Unexpected error: ' + ((e.reason && e.reason.message) || e.reason), 'warn');
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => { window.removeEventListener('error', onError); window.removeEventListener('unhandledrejection', onRejection); };
  }, [notify]);

  const remember = () => {
    past.current.push(ref.current);
    if (past.current.length > UNDO_LIMIT) past.current.shift();
    setUndoDepth(past.current.length);
  };

  // Run a pure logic function on a clone of the state, snapshot the burndown, store the result.
  const apply = useCallback((fn) => {
    remember();
    const next = structuredClone(ref.current);
    fn(next);
    L.snapshot(next);
    ref.current = next;
    setState(next);
    return next;
  }, []);

  const warnWip = useCallback((next, colId) => {
    const w = L.wipStatus(next, colId);
    if (w.status === 'over') notify(`⚠ ${L.col(next, colId).name} is over its WIP limit (${w.count}/${w.limit})`, 'warn');
  }, [notify]);

  const rejected = (errs) => { notify(errs[0], 'warn'); return false; };

  const actions = useMemo(() => ({
    moveCard: (id, colId, beforeId) => warnWip(apply((s) => L.moveCard(s, id, colId, beforeId)), colId),
    saveCard: (d) => {
      const errs = validateCardInput(d, ref.current);
      if (errs.length) return rejected(errs);
      warnWip(apply((s) => L.upsertCard(s, d)), d.colId);
      return true;
    },
    deleteCard: (id) => apply((s) => L.deleteCard(s, id)),
    setPoints: (id, p) => apply((s) => L.setPoints(s, id, p)),
    setWip: (colId, n) => apply((s) => L.setWip(s, colId, n)),
    updateSprint: (patch) => {
      const errs = validateSprintInput(patch);
      if (errs.length) return rejected(errs);
      apply((s) => L.updateSprint(s, patch));
      return true;
    },
    setDay: (d) => apply((s) => L.setDayOverride(s, d)),
    completeSprint: (n) => {
      const errs = validateSprintInput(n);
      if (errs.length) return rejected(errs);
      apply((s) => L.completeSprint(s, n));
      return true;
    },
    reset: () => { remember(); const s = seed(); L.snapshot(s); ref.current = s; setState(s); },
    addRetro: (list, text) => {
      const errs = validateRetroText(text);
      if (errs.length) return rejected(errs);
      apply((s) => L.addRetro(s, list, text));
      return true;
    },
    delRetro: (list, id) => apply((s) => L.delRetro(s, list, id)),
    voteRetro: (list, id) => apply((s) => L.voteRetro(s, list, id)),
    toggleAction: (id) => apply((s) => L.toggleAction(s, id)),
    autoRetro: () => apply((s) => L.autoRetro(s)),

    // undo the last change (Ctrl/Cmd+Z)
    undo: () => {
      const prev = past.current.pop();
      if (!prev) return;
      ref.current = prev; setState(prev); setUndoDepth(past.current.length);
      notify('Undone');
    },
    // backup: export / import the whole board as JSON (imports are validated)
    exportJson: () => {
      const blob = new Blob([JSON.stringify(ref.current, null, 2)], { type: 'application/json' });
      const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `cardcascade-sprint-${ref.current.sprint.id}.json` });
      a.click(); URL.revokeObjectURL(a.href);
    },
    importJson: (text) => {
      let data;
      try { data = JSON.parse(text); } catch (e) { return rejected(['That file is not valid JSON.']); }
      const v = validateState(data);
      if (!v.ok) return rejected([`Import rejected: ${v.errors[0]}`]);
      remember();
      const s = sanitizeState(data); L.snapshot(s);
      ref.current = s; setState(s);
      notify('Board imported');
      return true;
    },
  }), [apply, warnWip, notify]);

  // Ctrl/Cmd + Z (ignored while typing in a field)
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) { e.preventDefault(); actions.undo(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [actions]);

  const matches = useCallback((c) => {
    if (filters.assignees.length && !filters.assignees.includes(c.assignee)) return false;
    if (filters.tag && !c.tags.includes(filters.tag)) return false;
    const q = filters.q.trim().toLowerCase();
    return !q || [c.title, c.desc, c.id, ...c.tags].join(' ').toLowerCase().includes(q);
  }, [filters]);

  if (!state) return <div className="p-8 text-muted">Loading sprint…</div>;

  const value = {
    state, source, sync, theme, setTheme, toast, notify, canUndo: undoDepth > 0,
    draggingCardId, setDraggingCardId, filters, setFilters, matches,
    ...actions,
  };
  return <BoardContext.Provider value={value}>{children}</BoardContext.Provider>;
}
