// Date helpers. Dates are 'YYYY-MM-DD' strings to avoid timezone surprises.
export const iso = (d) => {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return z.toISOString().slice(0, 10);
};
export const parse = (s) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};
export const diffDays = (a, b) => Math.round((parse(a) - parse(b)) / 864e5);
export const addDays = (s, n) => {
  const d = parse(s);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
export const today = () => iso(new Date());
export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
export const initials = (name) => name.split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase();
export const hue = (str) => [...str].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);
