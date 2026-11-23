import { describe, it, expect } from 'vitest';
import { seed } from '../src/lib/seed.js';
import * as L from '../src/lib/sprintLogic.js';

const fresh = () => { const s = seed(); L.snapshot(s); return s; };

describe('totals & sprint clock', () => {
  it('computes planned / done / remaining points for the sample sprint', () => {
    expect(L.totals(fresh())).toEqual({ total: 42, done: 24, remaining: 18, pct: 57 });
  });
  it('is on day 6 of a 10-day sprint', () => {
    const s = fresh();
    expect(L.sprintLength(s)).toBe(10);
    expect(L.currentDay(s)).toBe(6);
  });
  it('honours the demo clock and clamps it to the sprint length', () => {
    const s = fresh();
    s.dayOverride = 99;
    expect(L.currentDay(s)).toBe(10);
    s.dayOverride = 0;
    expect(L.currentDay(s)).toBe(1);
  });
});

describe('moveCard (column re-ordering)', () => {
  it('moves a card to Done: remaining drops 18 -> 13 and completedAt is set', () => {
    const s = fresh();
    L.moveCard(s, 'CC-109', 'done');
    L.snapshot(s);
    expect(L.totals(s).remaining).toBe(13);
    expect(s.cards.find((c) => c.id === 'CC-109').completedAt).toBeTruthy();
  });
  it('clears completedAt when a card leaves Done', () => {
    const s = fresh();
    L.moveCard(s, 'CC-101', 'todo');
    expect(s.cards.find((c) => c.id === 'CC-101').completedAt).toBeUndefined();
    expect(L.totals(s).remaining).toBe(21);
  });
  it('inserts the card before the given card', () => {
    const s = fresh();
    L.moveCard(s, 'CC-114', 'review', 'CC-112');
    expect(L.cardsIn(s, 'review').map((c) => c.id)).toEqual(['CC-111', 'CC-114', 'CC-112']);
  });
  it('appends to the end when no beforeId is given or beforeId is the card itself', () => {
    const s = fresh();
    L.moveCard(s, 'CC-114', 'review');
    expect(L.cardsIn(s, 'review').map((c) => c.id)).toEqual(['CC-111', 'CC-112', 'CC-114']);
    L.moveCard(s, 'CC-114', 'review', 'CC-114');
    expect(L.cardsIn(s, 'review').map((c) => c.id)).toEqual(['CC-111', 'CC-112', 'CC-114']);
  });
  it('ignores unknown cards and unknown columns', () => {
    const s = fresh();
    const before = JSON.stringify(s);
    L.moveCard(s, 'NOPE', 'done');
    L.moveCard(s, 'CC-109', 'nowhere');
    expect(JSON.stringify(s)).toBe(before);
  });
});

describe('WIP limits', () => {
  it('reports ok / at / over', () => {
    const s = fresh();
    expect(L.wipStatus(s, 'review').status).toBe('ok');   // 2 of 3
    L.moveCard(s, 'CC-113', 'review');
    expect(L.wipStatus(s, 'review').status).toBe('at');   // 3 of 3
    L.moveCard(s, 'CC-114', 'review');
    const w = L.wipStatus(s, 'review');
    expect(w.status).toBe('over');
    expect(w.count).toBe(4);
    expect(w.limit).toBe(3);
  });
  it('columns without a limit are never flagged', () => {
    expect(L.wipStatus(fresh(), 'backlog').status).toBe('none');
  });
  it('setWip clamps and clears limits', () => {
    const s = fresh();
    L.setWip(s, 'todo', 500);
    expect(L.col(s, 'todo').wip).toBe(100);
    L.setWip(s, 'todo', 0);
    expect(L.col(s, 'todo').wip).toBeNull();
    L.setWip(s, 'todo', 2.5);
    expect(L.col(s, 'todo').wip).toBeNull();
  });
});

describe('burndown', () => {
  it('builds an ideal line from total to 0 and an actual line with today live', () => {
    const b = L.burndown(fresh());
    expect(b.labels).toHaveLength(11);
    expect(b.ideal[0]).toBe(42);
    expect(b.ideal[10]).toBe(0);
    expect(b.ideal[5]).toBeCloseTo(21, 5);
    expect(b.actual.slice(0, 7)).toEqual([42, 42, 39, 34, 29, 23, 18]);
    expect(b.actual[7]).toBeNull();
  });
  it('updates the live point after a card move', () => {
    const s = fresh();
    L.moveCard(s, 'CC-109', 'done');
    L.snapshot(s);
    expect(L.burndown(s).actual[6]).toBe(13);
  });
  it('snapshot() fills skipped days with the last known value', () => {
    const s = fresh();
    s.sprint.snapshots = { 0: 42, 1: 40 };
    L.snapshot(s);
    expect(s.sprint.snapshots[2]).toBe(40);
    expect(s.sprint.snapshots[5]).toBe(40);
    expect(s.sprint.snapshots[6]).toBe(18);
  });
});

describe('cards', () => {
  it('creates a card with an incrementing id', () => {
    const s = fresh();
    const next = s.counter;
    L.upsertCard(s, { id: null, title: 'New', desc: '', points: 3, assignee: '', tags: [], colId: 'todo' });
    expect(s.cards[s.cards.length - 1].id).toBe('CC-' + next);
    expect(s.counter).toBe(next + 1);
  });
  it('updates a card and moves it when the column changes', () => {
    const s = fresh();
    L.upsertCard(s, { id: 'CC-109', title: 'Renamed', desc: 'x', points: 8, assignee: 'zoya', tags: ['a'], colId: 'done' });
    const c = s.cards.find((x) => x.id === 'CC-109');
    expect(c.title).toBe('Renamed');
    expect(c.colId).toBe('done');
    expect(c.points).toBe(8);
  });
  it('deletes a card', () => {
    const s = fresh();
    L.deleteCard(s, 'CC-109');
    expect(s.cards).toHaveLength(17);
  });
  it('only accepts Fibonacci story points', () => {
    const s = fresh();
    L.setPoints(s, 'CC-109', 4);
    expect(s.cards.find((c) => c.id === 'CC-109').points).toBe(5);
    L.setPoints(s, 'CC-109', 13);
    expect(s.cards.find((c) => c.id === 'CC-109').points).toBe(13);
  });
});

describe('distribution', () => {
  it('sums to the total and flags the heaviest developer', () => {
    const d = L.distribution(fresh());
    expect(d.reduce((a, x) => a + x.value, 0)).toBe(42);
    expect(d.find((x) => x.id === 'zoya').value).toBe(14);
  });
});

describe('completeSprint', () => {
  it('records velocity, archives Done cards and carries over the rest', () => {
    const s = fresh();
    L.completeSprint(s, { name: 'Sprint 15', goal: '', start: '2026-12-01', end: '2026-12-10' });
    expect(s.history[s.history.length - 1]).toEqual({ name: 'Sprint 14: Mobile MVP', velocity: 24, committed: 42 });
    expect(s.cards).toHaveLength(10);
    expect(s.sprint.id).toBe(15);
    expect(s.sprint.snapshots).toEqual({ 0: 18 });
    expect(s.dayOverride).toBeNull();
  });
});

describe('autoRetro', () => {
  it('reports WIP breaches and is idempotent', () => {
    const s = fresh();
    L.moveCard(s, 'CC-113', 'review');
    L.moveCard(s, 'CC-114', 'review');
    L.autoRetro(s);
    const n = s.retro.improve.length;
    expect(s.retro.improve.some((i) => i.text.includes('over its WIP limit'))).toBe(true);
    L.autoRetro(s);
    expect(s.retro.improve).toHaveLength(n);
  });
});

describe('forecast', () => {
  it('projects the sample sprint to finish slightly late', () => {
    const f = L.forecast(fresh());
    expect(f.rate).toBeCloseTo(4, 5);
    expect(f.finishDay).toBeCloseTo(10.5, 5);
    expect(f.onTrack).toBe(false);
    expect(f.shortBy).toBeCloseTo(2, 5);
  });
  it('is on track after finishing User Auth API', () => {
    const s = fresh();
    L.moveCard(s, 'CC-109', 'done');
    L.snapshot(s);
    const f = L.forecast(s);
    expect(f.onTrack).toBe(true);
    expect(f.finishDay).toBeCloseTo(8.7, 1);
    expect(f.shortBy).toBe(0);
  });
  it('cannot project a finish day when nothing has burned', () => {
    const s = fresh();
    s.sprint.snapshots = { 0: 42 };
    s.cards.forEach((c) => { c.colId = 'todo'; delete c.completedAt; });
    L.snapshot(s);
    const f = L.forecast(s);
    expect(f.rate).toBe(0);
    expect(f.finishDay).toBeNull();
    expect(f.onTrack).toBe(false);
  });
  it('projected series starts today and never goes below zero', () => {
    const f = L.forecast(fresh());
    expect(f.projected[5]).toBeNull();
    expect(f.projected[6]).toBe(18);
    expect(f.projected[10]).toBeGreaterThan(-0.0001);
  });
});
