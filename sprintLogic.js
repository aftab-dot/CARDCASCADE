// Pure sprint logic shared by the React app AND the Express server.
// Functions named like actions MUTATE the state object they receive (callers pass a clone).
import { addDays, clamp, diffDays, today } from './util.js';

export const FIB = [1, 2, 3, 5, 8, 13];

// ---------- reads ----------
export const col = (s, id) => s.columns.find((c) => c.id === id);
export const isDone = (s, colId) => !!col(s, colId)?.done;
export const cardsIn = (s, colId) => s.cards.filter((c) => c.colId === colId);
export const member = (s, id) => s.team.find((t) => t.id === id);
const sum = (arr) => arr.reduce((a, c) => a + c.points, 0);

export function totals(s) {
  const total = sum(s.cards);
  const done = sum(s.cards.filter((c) => isDone(s, c.colId)));
  return { total, done, remaining: total - done, pct: total ? Math.round((done / total) * 100) : 0 };
}
export const sprintLength = (s) => Math.max(1, diffDays(s.sprint.end, s.sprint.start) + 1);

export function currentDay(s) {
  const len = sprintLength(s);
  if (s.dayOverride != null) return clamp(s.dayOverride, 1, len);
  return clamp(diffDays(today(), s.sprint.start) + 1, 1, len);
}

// WIP status: 'over' when cards > limit, 'at' when equal, 'ok' below, 'none' if no limit
export function wipStatus(s, colId) {
  const limit = col(s, colId).wip;
  const count = cardsIn(s, colId).length;
  if (!limit) return { count, limit: null, status: 'none' };
  return { count, limit, status: count > limit ? 'over' : count === limit ? 'at' : 'ok' };
}

// Burndown: ideal = linear burn rate from total → 0 over the sprint length.
// Actual = remaining points from daily snapshots; today's point is always live.
export function burndown(s) {
  const len = sprintLength(s), day = currentDay(s), t = totals(s);
  const labels = [], ideal = [], actual = [];
  let last = s.sprint.snapshots[0] ?? t.total;
  for (let d = 0; d <= len; d++) {
    labels.push(d);
    ideal.push(+(t.total * (1 - d / len)).toFixed(2));
    if (d === 0) actual.push(last);
    else if (d < day) { last = s.sprint.snapshots[d] ?? last; actual.push(last); }
    else if (d === day) actual.push(t.remaining);
    else actual.push(null);
  }
  return { labels, ideal, actual, day, len, total: t.total, remaining: t.remaining };
}

export function distribution(s) {
  const per = s.team.map((m) => ({ id: m.id, label: m.name, color: m.color, value: sum(s.cards.filter((c) => c.assignee === m.id)) }));
  const un = sum(s.cards.filter((c) => !member(s, c.assignee)));
  if (un) per.push({ id: '', label: 'Unassigned', color: '#8b93a7', value: un });
  return per;
}

// ---------- mutations ----------
// Record "remaining points" for today (and fill skipped days) after every change.
export function snapshot(s) {
  const day = currentDay(s), sn = s.sprint.snapshots;
  let last = sn[0] ?? totals(s).total;
  for (let d = 1; d < day; d++) { if (sn[d] == null) sn[d] = last; last = sn[d]; }
  sn[day] = totals(s).remaining;
}

// Column re-ordering logic: remove the card, insert it before `beforeId`
// (or after the last card of the destination column).
export function moveCard(s, id, colId, beforeId = null) {
  const card = s.cards.find((c) => c.id === id);
  if (!card || !col(s, colId)) return;
  const arr = s.cards;
  arr.splice(arr.indexOf(card), 1);
  const wasDone = isDone(s, card.colId);
  card.colId = colId;
  let pos = beforeId && beforeId !== id ? arr.findIndex((c) => c.id === beforeId) : -1;
  if (pos < 0) {
    let last = -1;
    arr.forEach((c, i) => { if (c.colId === colId) last = i; });
    pos = last + 1;
  }
  arr.splice(pos, 0, card);
  if (isDone(s, colId) && !wasDone) card.completedAt = today();
  if (!isDone(s, colId)) delete card.completedAt;
}

export function upsertCard(s, d) {
  const card = d.id && s.cards.find((c) => c.id === d.id);
  if (card) {
    Object.assign(card, { title: d.title, desc: d.desc, points: d.points, assignee: d.assignee, tags: d.tags });
    if (card.colId !== d.colId) moveCard(s, card.id, d.colId, null);
  } else {
    const n = { id: 'CC-' + s.counter++, title: d.title, desc: d.desc, points: d.points, assignee: d.assignee, tags: d.tags, colId: d.colId };
    if (isDone(s, n.colId)) n.completedAt = today();
    s.cards.push(n);
  }
}
export const deleteCard = (s, id) => { s.cards = s.cards.filter((c) => c.id !== id); };
export const setPoints = (s, id, pts) => { const c = s.cards.find((x) => x.id === id); if (c && FIB.includes(pts)) c.points = pts; };
export const setWip = (s, colId, limit) => { const c = col(s, colId); if (c) c.wip = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 100) : null; };
export const updateSprint = (s, patch) => Object.assign(s.sprint, patch);
export const setDayOverride = (s, v) => { s.dayOverride = v; };

// Close the sprint: record velocity, archive Done cards, carry the rest over.
export function completeSprint(s, next) {
  const t = totals(s);
  s.history.push({ name: s.sprint.name, velocity: t.done, committed: t.total });
  s.cards = s.cards.filter((c) => !isDone(s, c.colId));
  s.sprint = { id: s.sprint.id + 1, name: next.name, goal: next.goal, start: next.start, end: next.end, snapshots: {} };
  s.sprint.snapshots[0] = totals(s).total;
  s.dayOverride = null;
  s.retro = { well: [], improve: [], actions: s.retro.actions.filter((a) => !a.done) };
}

// ---------- retrospective ----------
const rid = () => 'r' + Math.random().toString(36).slice(2, 9);
export const addRetro = (s, list, text) => s.retro[list].push({ id: rid(), text, votes: 0, done: false });
export const delRetro = (s, list, id) => { s.retro[list] = s.retro[list].filter((i) => i.id !== id); };
export const voteRetro = (s, list, id) => { const i = s.retro[list].find((x) => x.id === id); if (i) i.votes++; };
export const toggleAction = (s, id) => { const i = s.retro.actions.find((x) => x.id === id); if (i) i.done = !i.done; };

// Build retrospective notes automatically from the sprint data.
export function autoRetro(s) {
  const r = s.retro;
  ['well', 'improve', 'actions'].forEach((k) => (r[k] = r[k].filter((i) => !i.auto)));
  const add = (k, text) => r[k].push({ id: rid(), text, votes: 0, done: false, auto: true });
  const t = totals(s);
  const avg = s.history.length ? s.history.reduce((a, h) => a + h.velocity, 0) / s.history.length : 0;
  if (avg) {
    if (t.done >= avg) add('well', `Velocity of ${t.done} pts is at or above the ${avg.toFixed(0)} pt average.`);
    else add('improve', `Velocity of ${t.done} pts is below the ${avg.toFixed(0)} pt average.`);
  }
  const b = burndown(s), idealNow = b.ideal[b.day];
  if (b.remaining <= idealNow) add('well', `Burndown is on or ahead of the ideal line (${b.remaining} vs ${idealNow.toFixed(1)} pts).`);
  else {
    add('improve', `Burndown is behind ideal by ${(b.remaining - idealNow).toFixed(1)} pts.`);
    add('actions', 'Re-scope or swarm on blocked stories in the next planning session.');
  }
  s.columns.forEach((c) => {
    const w = wipStatus(s, c.id);
    if (w.status === 'over') {
      add('improve', `${c.name} is over its WIP limit (${w.count}/${w.limit}).`);
      add('actions', `Stop starting, start finishing: clear ${c.name} before pulling new work.`);
    }
  });
  const total = t.total || 1;
  distribution(s).filter((d) => d.id).forEach((d) => {
    if (d.value / total > 0.3) {
      add('improve', `${d.label} carries ${Math.round((d.value / total) * 100)}% of all story points.`);
      add('actions', `Rebalance some of ${d.label}'s stories across the team.`);
    }
  });
  const left = s.cards.filter((c) => !isDone(s, c.colId));
  if (left.length) add('improve', `${left.length} stories (${t.remaining} pts) are unfinished and will carry over.`);
}


// Forecast: extrapolate the average burn rate so far to predict whether the sprint finishes on time.
export function forecast(s) {
  const b = burndown(s);
  const baseline = b.actual[0];
  const burned = baseline - b.remaining;
  const rate = b.day > 0 ? Math.max(0, burned / b.day) : 0; // points burned per sprint day
  const daysNeeded = rate > 0 ? b.remaining / rate : Infinity;
  const finishDay = b.remaining === 0 ? b.day : Number.isFinite(daysNeeded) ? +(b.day + daysNeeded).toFixed(1) : null;
  const shortBy = Math.max(0, +(b.remaining - rate * (b.len - b.day)).toFixed(1));
  const projected = b.labels.map((d) => (d < b.day ? null : Math.max(0, +(b.remaining - rate * (d - b.day)).toFixed(2))));
  return {
    rate: +rate.toFixed(2), finishDay, shortBy, projected,
    onTrack: b.remaining === 0 || (finishDay !== null && finishDay <= b.len),
  };
}

export { addDays };
