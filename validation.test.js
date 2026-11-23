import { describe, it, expect } from 'vitest';
import { seed } from '../src/lib/seed.js';
import { sanitizeState, validateCardInput, validateMovePayload, validateRetroText, validateSprintInput, validateState } from '../src/lib/validation.js';

const fresh = () => seed();
const invalid = (mutate) => { const s = fresh(); mutate(s); return validateState(s); };

describe('validateState', () => {
  it('accepts the sample data and its sanitized copy', () => {
    expect(validateState(fresh()).ok).toBe(true);
    expect(validateState(sanitizeState(fresh())).ok).toBe(true);
  });
  it('rejects non-objects and wrong versions', () => {
    expect(validateState(null).ok).toBe(false);
    expect(validateState([]).ok).toBe(false);
    expect(validateState('x').ok).toBe(false);
    expect(invalid((s) => { s.version = 2; }).ok).toBe(false);
  });
  it('rejects bad cards', () => {
    expect(invalid((s) => { s.cards[0].colId = 'nope'; }).ok).toBe(false);
    expect(invalid((s) => { s.cards[0].points = 4; }).ok).toBe(false);
    expect(invalid((s) => { s.cards[0].title = '   '; }).ok).toBe(false);
    expect(invalid((s) => { s.cards[0].title = 'x'.repeat(121); }).ok).toBe(false);
    expect(invalid((s) => { s.cards[0].assignee = 'ghost'; }).ok).toBe(false);
    expect(invalid((s) => { s.cards[0].tags = 'frontend'; }).ok).toBe(false);
    expect(invalid((s) => { s.cards[1].id = s.cards[0].id; }).ok).toBe(false);
    expect(invalid((s) => { s.cards[0].id = '../etc'; }).ok).toBe(false);
  });
  it('rejects too many cards', () => {
    expect(invalid((s) => { s.cards = Array.from({ length: 501 }, (_, i) => ({ ...s.cards[0], id: 'CC-' + (1000 + i) })); }).ok).toBe(false);
  });
  it('rejects bad columns', () => {
    expect(invalid((s) => { s.columns[1].wip = 0; }).ok).toBe(false);
    expect(invalid((s) => { s.columns[1].wip = 101; }).ok).toBe(false);
    expect(invalid((s) => { s.columns[1].color = 'red'; }).ok).toBe(false);
    expect(invalid((s) => { s.columns.forEach((c) => { delete c.done; }); }).ok).toBe(false);
    expect(invalid((s) => { s.columns[1].id = s.columns[0].id; }).ok).toBe(false);
  });
  it('rejects bad sprint data', () => {
    expect(invalid((s) => { s.sprint.start = '2026-13-45'; }).ok).toBe(false);
    expect(invalid((s) => { s.sprint.end = '2000-01-01'; }).ok).toBe(false);
    expect(invalid((s) => { s.sprint.end = '2099-01-01'; }).ok).toBe(false);
    expect(invalid((s) => { s.sprint.name = ''; }).ok).toBe(false);
    expect(invalid((s) => { s.sprint.snapshots = { abc: 1 }; }).ok).toBe(false);
    expect(invalid((s) => { s.sprint.snapshots = { 1: -5 }; }).ok).toBe(false);
    expect(invalid((s) => { s.dayOverride = 0; }).ok).toBe(false);
  });
  it('rejects bad history, retro and team', () => {
    expect(invalid((s) => { s.history[0].velocity = 'fast'; }).ok).toBe(false);
    expect(invalid((s) => { s.retro.well[0].text = 'x'.repeat(201); }).ok).toBe(false);
    expect(invalid((s) => { s.retro.actions = 'none'; }).ok).toBe(false);
    expect(invalid((s) => { s.team = []; }).ok).toBe(false);
    expect(invalid((s) => { s.team[0].color = 'blue'; }).ok).toBe(false);
  });
  it('lists at most 20 error messages', () => {
    const r = invalid((s) => { s.cards.forEach((c) => { c.points = 4; c.title = ''; }); });
    expect(r.errors.length).toBeLessThan(21);
  });
});

describe('sanitizeState', () => {
  it('drops unknown keys and trims titles', () => {
    const s = fresh();
    s.hacked = true; s.cards[0].extra = 'x'; s.cards[0].title = '  Padded  ';
    const clean = sanitizeState(s);
    expect(clean.hacked).toBeUndefined();
    expect(clean.cards[0].extra).toBeUndefined();
    expect(clean.cards[0].title).toBe('Padded');
  });
  it('is not affected by __proto__ payloads', () => {
    const s = JSON.parse(JSON.stringify(fresh()));
    const evil = JSON.parse('{"__proto__": {"polluted": true}}');
    s.sprint.snapshots = Object.assign({}, s.sprint.snapshots);
    s.extra = evil;
    const clean = sanitizeState(s);
    expect(clean.extra).toBeUndefined();
    expect({}.polluted).toBeUndefined();
  });
});

describe('validateCardInput', () => {
  const ok = { id: null, title: 'A story', desc: '', points: 3, assignee: '', tags: ['qa'], colId: 'todo' };
  it('accepts a valid new card', () => expect(validateCardInput(ok, fresh())).toEqual([]));
  it('accepts a valid edit of an existing card', () => expect(validateCardInput({ ...ok, id: 'CC-101' }, fresh())).toEqual([]));
  it('rejects missing title, bad points, bad column and too many tags', () => {
    expect(validateCardInput({ ...ok, title: '' }, fresh()).length).toBeGreaterThan(0);
    expect(validateCardInput({ ...ok, points: 7 }, fresh()).length).toBeGreaterThan(0);
    expect(validateCardInput({ ...ok, colId: 'x' }, fresh()).length).toBeGreaterThan(0);
    expect(validateCardInput({ ...ok, tags: Array.from({ length: 9 }, (_, i) => 't' + i) }, fresh()).length).toBeGreaterThan(0);
  });
  it('rejects editing a card that does not exist', () => {
    expect(validateCardInput({ ...ok, id: 'CC-999' }, fresh()).length).toBeGreaterThan(0);
  });
  it('rejects non-objects', () => expect(validateCardInput(null, fresh()).length).toBeGreaterThan(0));
});

describe('validateMovePayload', () => {
  it('accepts valid payloads', () => {
    expect(validateMovePayload({ colId: 'done' }, fresh())).toEqual([]);
    expect(validateMovePayload({ colId: 'done', beforeId: 'CC-101' }, fresh())).toEqual([]);
    expect(validateMovePayload({ colId: 'done', beforeId: null }, fresh())).toEqual([]);
  });
  it('rejects unknown columns / cards and bad bodies', () => {
    expect(validateMovePayload({ colId: 'x' }, fresh()).length).toBeGreaterThan(0);
    expect(validateMovePayload({ colId: 'done', beforeId: 'nope' }, fresh()).length).toBeGreaterThan(0);
    expect(validateMovePayload(undefined, fresh()).length).toBeGreaterThan(0);
    expect(validateMovePayload({ colId: 5 }, fresh()).length).toBeGreaterThan(0);
  });
});

describe('validateSprintInput / validateRetroText', () => {
  const ok = { name: 'Sprint 15', goal: 'Ship it', start: '2026-12-01', end: '2026-12-10' };
  it('accepts valid sprint input', () => expect(validateSprintInput(ok)).toEqual([]));
  it('rejects empty names, reversed dates, impossible dates and very long sprints', () => {
    expect(validateSprintInput({ ...ok, name: ' ' }).length).toBeGreaterThan(0);
    expect(validateSprintInput({ ...ok, end: '2026-11-01' }).length).toBeGreaterThan(0);
    expect(validateSprintInput({ ...ok, start: '2026-02-31' }).length).toBeGreaterThan(0);
    expect(validateSprintInput({ ...ok, end: '2027-12-31' }).length).toBeGreaterThan(0);
  });
  it('validates retrospective notes', () => {
    expect(validateRetroText('Good job')).toEqual([]);
    expect(validateRetroText('   ').length).toBeGreaterThan(0);
    expect(validateRetroText('x'.repeat(201)).length).toBeGreaterThan(0);
  });
});
