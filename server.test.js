import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { seed } from '../src/lib/seed.js';
import * as H from '../server/handlers.js';
import { createStore } from '../server/store.js';
import { createLogger } from '../server/logger.js';
import { createRateLimiter } from '../server/rateLimit.js';
import { securityHeaders } from '../server/security.js';

let entries, logger, store;
beforeEach(() => {
  entries = [];
  logger = createLogger({ sink: (e) => entries.push(e) });
  store = createStore({ file: null, seedFn: seed, logger });
});

describe('GET handlers', () => {
  it('returns the state, burndown, forecast and WIP status', () => {
    expect(H.getState(store).body.cards).toHaveLength(18);
    expect(H.getBurndown(store).body.actual[6]).toBe(18);
    expect(H.getForecast(store).body.onTrack).toBe(false);
    const wip = H.getWip(store).body;
    expect(wip.find((w) => w.column === 'progress').limit).toBe(3);
  });
});

describe('PUT /api/state', () => {
  it('rejects an invalid payload with 400 + details and leaves the state untouched', () => {
    const bad = seed(); bad.cards[0].points = 99;
    const r = H.putState(store, logger, bad);
    expect(r.status).toBe(400);
    expect(r.body.details.length).toBeGreaterThan(0);
    expect(store.get().cards[0].points).toBe(3);
    expect(entries.some((e) => e.level === 'warn')).toBe(true);
  });
  it('rejects garbage bodies', () => {
    expect(H.putState(store, logger, undefined).status).toBe(400);
    expect(H.putState(store, logger, 'hello').status).toBe(400);
  });
  it('stores a valid state and strips unknown fields', () => {
    const good = seed(); good.evil = 'x'; good.cards.pop();
    expect(H.putState(store, logger, good).status).toBe(200);
    expect(store.get().cards).toHaveLength(17);
    expect(store.get().evil).toBeUndefined();
  });
});

describe('POST /api/cards/:id/move', () => {
  it('moves a card and returns the updated burndown (18 -> 13)', () => {
    const r = H.moveCard(store, logger, 'CC-109', { colId: 'done' });
    expect(r.status).toBe(200);
    expect(r.body.burndown.actual[6]).toBe(13);
    expect(store.get().cards.find((c) => c.id === 'CC-109').colId).toBe('done');
    expect(entries.some((e) => e.msg === 'Card moved' && e.from === 'progress' && e.to === 'done')).toBe(true);
  });
  it('404 for unknown cards, 400 for bad payloads', () => {
    expect(H.moveCard(store, logger, 'CC-999', { colId: 'done' }).status).toBe(404);
    expect(H.moveCard(store, logger, 'CC-109', { colId: 'nope' }).status).toBe(400);
    expect(H.moveCard(store, logger, 'CC-109', null).status).toBe(400);
    expect(store.get().cards.find((c) => c.id === 'CC-109').colId).toBe('progress');
  });
  it('logs a warning when the WIP limit is exceeded', () => {
    H.moveCard(store, logger, 'CC-113', { colId: 'review' });
    H.moveCard(store, logger, 'CC-114', { colId: 'review' });
    expect(entries.some((e) => e.msg === 'WIP limit exceeded' && e.level === 'warn')).toBe(true);
  });
});

describe('GET /api/cards (pagination)', () => {
  it('paginates', () => {
    const r = H.listCards(store, { page: '2', limit: '5' }).body;
    expect(r.items).toHaveLength(5);
    expect(r.total).toBe(18);
    expect(r.pages).toBe(4);
    expect(r.page).toBe(2);
  });
  it('filters by column and search text', () => {
    expect(H.listCards(store, { colId: 'done' }).body.total).toBe(8);
    expect(H.listCards(store, { q: 'auth' }).body.items[0].id).toBe('CC-109');
    expect(H.listCards(store, { assignee: 'zoya' }).body.total).toBe(6);
  });
  it('rejects invalid paging parameters', () => {
    expect(H.listCards(store, { page: '0' }).status).toBe(400);
    expect(H.listCards(store, { limit: '1000' }).status).toBe(400);
    expect(H.listCards(store, { limit: 'abc' }).status).toBe(400);
  });
});

describe('reset', () => {
  it('restores the sample data', () => {
    H.moveCard(store, logger, 'CC-109', { colId: 'done' });
    H.reset(store, logger, seed);
    expect(store.get().cards.find((c) => c.id === 'CC-109').colId).toBe('progress');
  });
});

describe('store persistence', () => {
  it('writes atomically and reloads valid data', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cc-'));
    const file = path.join(dir, 'state.json');
    const a = createStore({ file, seedFn: seed, logger });
    H.moveCard(a, logger, 'CC-109', { colId: 'done' });
    const b = createStore({ file, seedFn: seed, logger });
    expect(b.get().cards.find((c) => c.id === 'CC-109').colId).toBe('done');
    expect(fs.existsSync(file + '.tmp')).toBe(false);
  });
  it('falls back to sample data when the file is corrupted', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cc-'));
    const file = path.join(dir, 'state.json');
    fs.writeFileSync(file, '{ not json');
    const s = createStore({ file, seedFn: seed, logger });
    expect(s.get().cards).toHaveLength(18);
    expect(entries.some((e) => e.level === 'warn')).toBe(true);
  });
  it('falls back to sample data when the file fails validation', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cc-'));
    const file = path.join(dir, 'state.json');
    const bad = seed(); bad.cards[0].points = 7;
    fs.writeFileSync(file, JSON.stringify(bad));
    const s = createStore({ file, seedFn: seed, logger });
    expect(s.get().cards[0].points).toBe(3);
  });
});

describe('logger', () => {
  it('respects the log level', () => {
    const got = [];
    const l = createLogger({ level: 'warn', sink: (e) => got.push(e) });
    l.info('quiet'); l.warn('loud'); l.error('louder');
    expect(got.map((e) => e.msg)).toEqual(['loud', 'louder']);
  });
});

const fakeRes = () => {
  const r = { headers: {}, code: 200, body: null };
  r.setHeader = (k, v) => { r.headers[k] = v; };
  r.status = (c) => { r.code = c; return r; };
  r.json = (b) => { r.body = b; return r; };
  return r;
};

describe('rate limiter', () => {
  it('blocks after the limit and recovers after the window', () => {
    let t = 0;
    const limit = createRateLimiter({ windowMs: 1000, max: 3, now: () => t });
    const req = { ip: '1.2.3.4' };
    let passed = 0;
    for (let i = 0; i < 3; i++) limit(req, fakeRes(), () => { passed++; });
    expect(passed).toBe(3);
    const blocked = fakeRes();
    limit(req, blocked, () => { passed++; });
    expect(passed).toBe(3);
    expect(blocked.code).toBe(429);
    expect(blocked.headers['Retry-After']).toBeTruthy();
    t = 1500;
    limit(req, fakeRes(), () => { passed++; });
    expect(passed).toBe(4);
  });
  it('tracks clients separately', () => {
    const limit = createRateLimiter({ windowMs: 1000, max: 1, now: () => 0 });
    let passed = 0;
    limit({ ip: 'a' }, fakeRes(), () => { passed++; });
    limit({ ip: 'b' }, fakeRes(), () => { passed++; });
    expect(passed).toBe(2);
  });
});

describe('security headers', () => {
  it('sets hardening headers and disables caching for the API', () => {
    const res = fakeRes();
    let called = false;
    securityHeaders({ path: '/api/state' }, res, () => { called = true; });
    expect(called).toBe(true);
    expect(res.headers['X-Content-Type-Options']).toBe('nosniff');
    expect(res.headers['X-Frame-Options']).toBe('DENY');
    expect(res.headers['Cache-Control']).toBe('no-store');
  });
  it('does not disable caching for static files', () => {
    const res = fakeRes();
    securityHeaders({ path: '/assets/app.js' }, res, () => {});
    expect(res.headers['Cache-Control']).toBeUndefined();
  });
});
