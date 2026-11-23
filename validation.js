// Strict schema validation, shared by the React app and the Express server.
// Everything that crosses a trust boundary (PUT /api/state, move payloads, imported files,
// data read back from localStorage) is validated here before it is accepted.
import { FIB } from './sprintLogic.js';
import { diffDays } from './util.js';

export const LIMITS = {
  maxCards: 500, maxColumns: 12, maxTeam: 20, maxHistory: 200, maxRetroItems: 100,
  title: 120, desc: 600, tag: 24, tagsPerCard: 8, sprintName: 60, goal: 160, retroText: 200,
  maxSprintDays: 60, maxWip: 100,
};

const ID = /^[A-Za-z0-9_-]{1,32}$/;
const COLOR = /^#[0-9a-fA-F]{6}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isInt = (v, min = 0, max = Number.MAX_SAFE_INTEGER) => Number.isInteger(v) && v >= min && v <= max;
const isStr = (v, max, min = 0) => typeof v === 'string' && v.length >= min && v.length <= max;
const isDate = (v) => {
  if (typeof v !== 'string' || !DATE.test(v)) return false;
  const d = new Date(v + 'T00:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v; // rejects 2026-02-31, 2026-13-45
};

// ---------- single card (used for the full state AND for the card form) ----------
function cardErrors(c, columnIds, teamIds, where, errors) {
  if (!isObj(c)) return errors.push(`${where}: must be an object`);
  if (typeof c.id !== 'string' || !ID.test(c.id)) errors.push(`${where}: invalid id`);
  if (!isStr(c.title, LIMITS.title) || !c.title.trim()) errors.push(`${where}: title is required (max ${LIMITS.title} characters)`);
  if (!isStr(c.desc, LIMITS.desc)) errors.push(`${where}: description must be text (max ${LIMITS.desc} characters)`);
  if (!FIB.includes(c.points)) errors.push(`${where}: story points must be one of ${FIB.join(', ')}`);
  if (c.assignee !== '' && !teamIds.includes(c.assignee)) errors.push(`${where}: unknown assignee`);
  if (!Array.isArray(c.tags) || c.tags.length > LIMITS.tagsPerCard || !c.tags.every((t) => isStr(t, LIMITS.tag, 1))) {
    errors.push(`${where}: up to ${LIMITS.tagsPerCard} tags of 1-${LIMITS.tag} characters`);
  }
  if (!columnIds.includes(c.colId)) errors.push(`${where}: unknown column`);
  if (c.completedAt !== undefined && !isDate(c.completedAt)) errors.push(`${where}: invalid completedAt`);
}

// ---------- whole state ----------
export function validateState(s) {
  const errors = [];
  if (!isObj(s)) return { ok: false, errors: ['State must be an object'] };
  if (s.version !== 1) errors.push('version must be 1');
  if (!isInt(s.counter, 1)) errors.push('counter must be a positive integer');

  const teamIds = [];
  if (!Array.isArray(s.team) || s.team.length < 1 || s.team.length > LIMITS.maxTeam) errors.push(`team: 1-${LIMITS.maxTeam} members required`);
  else s.team.forEach((m, i) => {
    if (!isObj(m) || !ID.test(m.id ?? '') || !isStr(m.name, 40, 1) || !COLOR.test(m.color ?? '')) errors.push(`team[${i}]: invalid member`);
    else if (teamIds.includes(m.id)) errors.push(`team[${i}]: duplicate id`);
    else teamIds.push(m.id);
  });

  const columnIds = [];
  if (!Array.isArray(s.columns) || s.columns.length < 2 || s.columns.length > LIMITS.maxColumns) errors.push(`columns: 2-${LIMITS.maxColumns} columns required`);
  else {
    s.columns.forEach((c, i) => {
      if (!isObj(c) || !ID.test(c.id ?? '') || !isStr(c.name, 30, 1) || !COLOR.test(c.color ?? '')) errors.push(`columns[${i}]: invalid column`);
      else if (columnIds.includes(c.id)) errors.push(`columns[${i}]: duplicate id`);
      else columnIds.push(c.id);
      if (isObj(c) && !(c.wip === null || isInt(c.wip, 1, LIMITS.maxWip))) errors.push(`columns[${i}]: wip must be null or 1-${LIMITS.maxWip}`);
      if (isObj(c) && c.done !== undefined && typeof c.done !== 'boolean') errors.push(`columns[${i}]: done must be boolean`);
    });
    if (!s.columns.some((c) => isObj(c) && c.done === true)) errors.push('columns: at least one column must be marked done');
  }

  if (!Array.isArray(s.cards) || s.cards.length > LIMITS.maxCards) errors.push(`cards: at most ${LIMITS.maxCards} cards`);
  else {
    const seen = new Set();
    s.cards.forEach((c, i) => {
      cardErrors(c, columnIds, teamIds, `cards[${i}]`, errors);
      if (isObj(c)) { if (seen.has(c.id)) errors.push(`cards[${i}]: duplicate id`); seen.add(c.id); }
    });
  }

  const sp = s.sprint;
  if (!isObj(sp)) errors.push('sprint: required');
  else {
    if (!isInt(sp.id, 1)) errors.push('sprint.id must be a positive integer');
    if (!isStr(sp.name, LIMITS.sprintName, 1)) errors.push('sprint.name is required');
    if (!isStr(sp.goal, LIMITS.goal)) errors.push('sprint.goal must be text');
    if (!isDate(sp.start) || !isDate(sp.end)) errors.push('sprint dates must be valid YYYY-MM-DD');
    else {
      const days = diffDays(sp.end, sp.start) + 1;
      if (days < 1 || days > LIMITS.maxSprintDays) errors.push(`sprint length must be 1-${LIMITS.maxSprintDays} days`);
    }
    if (!isObj(sp.snapshots)) errors.push('sprint.snapshots must be an object');
    else for (const [k, v] of Object.entries(sp.snapshots)) {
      if (!/^\d{1,2}$/.test(k) || !isInt(v, 0, 100000)) { errors.push('sprint.snapshots: invalid entry'); break; }
    }
  }
  if (!(s.dayOverride === null || isInt(s.dayOverride, 1, LIMITS.maxSprintDays))) errors.push('dayOverride must be null or a day number');

  if (!Array.isArray(s.history) || s.history.length > LIMITS.maxHistory) errors.push('history: invalid');
  else s.history.forEach((h, i) => {
    if (!isObj(h) || !isStr(h.name, LIMITS.sprintName, 1) || !isInt(h.velocity, 0, 100000) || !isInt(h.committed, 0, 100000)) errors.push(`history[${i}]: invalid`);
  });

  if (!isObj(s.retro)) errors.push('retro: required');
  else for (const k of ['well', 'improve', 'actions']) {
    const list = s.retro[k];
    if (!Array.isArray(list) || list.length > LIMITS.maxRetroItems) errors.push(`retro.${k}: invalid`);
    else list.forEach((r, i) => {
      if (!isObj(r) || !ID.test(r.id ?? '') || !isStr(r.text, LIMITS.retroText, 1) || !isInt(r.votes, 0, 100000)) errors.push(`retro.${k}[${i}]: invalid`);
    });
  }
  return { ok: errors.length === 0, errors: errors.slice(0, 20) };
}

// Build a clean copy containing ONLY known fields (drops unknown keys; never copies `__proto__` etc.).
// Call only after validateState() succeeded.
export function sanitizeState(s) {
  const snapshots = {};
  for (const [k, v] of Object.entries(s.sprint.snapshots)) snapshots[Number(k)] = v;
  const retro = {};
  for (const k of ['well', 'improve', 'actions']) {
    retro[k] = s.retro[k].map((r) => ({ id: r.id, text: r.text, votes: r.votes, done: !!r.done, ...(r.auto ? { auto: true } : {}) }));
  }
  return {
    version: 1,
    counter: s.counter,
    team: s.team.map((m) => ({ id: m.id, name: m.name, color: m.color })),
    columns: s.columns.map((c) => ({ id: c.id, name: c.name, wip: c.wip ?? null, color: c.color, ...(c.done ? { done: true } : {}) })),
    cards: s.cards.map((c) => ({
      id: c.id, title: c.title.trim(), desc: c.desc, points: c.points, assignee: c.assignee, tags: [...c.tags], colId: c.colId,
      ...(c.completedAt ? { completedAt: c.completedAt } : {}),
    })),
    sprint: { id: s.sprint.id, name: s.sprint.name, goal: s.sprint.goal, start: s.sprint.start, end: s.sprint.end, snapshots },
    dayOverride: s.dayOverride ?? null,
    history: s.history.map((h) => ({ name: h.name, velocity: h.velocity, committed: h.committed })),
    retro,
  };
}

// ---------- smaller payloads ----------
// Card form payload. `d.id` is null when creating.
export function validateCardInput(d, state) {
  const errors = [];
  if (!isObj(d)) return ['Card data must be an object'];
  const columnIds = state.columns.map((c) => c.id), teamIds = state.team.map((m) => m.id);
  const probe = { ...d, id: d.id ?? 'CC-0', desc: d.desc ?? '' };
  cardErrors(probe, columnIds, teamIds, 'card', errors);
  if (d.id && !state.cards.some((c) => c.id === d.id)) errors.push('card: does not exist');
  if (!d.id && state.cards.length >= LIMITS.maxCards) errors.push(`card: board is full (${LIMITS.maxCards} cards max)`);
  return errors.map((e) => { const m = e.replace(/^card: /, ''); return m.charAt(0).toUpperCase() + m.slice(1); });
}

// Payload of POST /api/cards/:id/move
export function validateMovePayload(p, state) {
  if (!isObj(p)) return ['Body must be a JSON object'];
  const errors = [];
  if (typeof p.colId !== 'string' || !state.columns.some((c) => c.id === p.colId)) errors.push('colId: unknown column');
  if (p.beforeId !== undefined && p.beforeId !== null && (typeof p.beforeId !== 'string' || !state.cards.some((c) => c.id === p.beforeId))) errors.push('beforeId: unknown card');
  return errors;
}

// Sprint form (name, goal, dates)
export function validateSprintInput(d) {
  const errors = [];
  if (!isObj(d)) return ['Sprint data must be an object'];
  if (!isStr(d.name, LIMITS.sprintName) || !d.name.trim()) errors.push(`Sprint name is required (max ${LIMITS.sprintName} characters)`);
  if (!isStr(d.goal ?? '', LIMITS.goal)) errors.push(`Goal must be at most ${LIMITS.goal} characters`);
  if (!isDate(d.start) || !isDate(d.end)) errors.push('Enter valid start and end dates');
  else {
    const days = diffDays(d.end, d.start) + 1;
    if (days < 1) errors.push('End date must be on or after the start date');
    else if (days > LIMITS.maxSprintDays) errors.push(`A sprint can be at most ${LIMITS.maxSprintDays} days`);
  }
  return errors;
}

export const validateRetroText = (t) => (isStr(t, LIMITS.retroText, 1) && t.trim() ? [] : [`Note must be 1-${LIMITS.retroText} characters`]);
