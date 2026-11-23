import { useBoard } from '../context/BoardContext.jsx';
import { btnGhost, input } from '../ui.js';
import Avatar from './Avatar.jsx';

// Quick filters: keyword search, one-click assignee avatars, tag dropdown
export default function Filters() {
  const { state, filters, setFilters } = useBoard();
  const tags = [...new Set(state.cards.flatMap((c) => c.tags))].sort();
  const toggle = (id) => setFilters((f) => ({ ...f, assignees: f.assignees.includes(id) ? f.assignees.filter((x) => x !== id) : [...f.assignees, id] }));
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2.5">
      <input type="search" className={`${input} max-w-[280px]`} placeholder="Search cards (title, tag, ID)…" aria-label="Search cards"
        value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} />
      <div className="flex gap-1.5" role="group" aria-label="Filter by assignee">
        {state.team.map((m) => {
          const on = filters.assignees.includes(m.id);
          return (
            <button key={m.id} aria-pressed={on} title={m.name} onClick={() => toggle(m.id)}
              className={`cursor-pointer rounded-full border-2 bg-transparent p-px transition hover:-translate-y-0.5 ${on ? 'border-accent shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent)_30%,transparent)]' : 'border-transparent'}`}>
              <Avatar id={m.id} big />
            </button>
          );
        })}
      </div>
      <select className={`${input.replace('w-full', 'w-auto')}`} aria-label="Filter by tag" value={filters.tag} onChange={(e) => setFilters({ ...filters, tag: e.target.value })}>
        <option value="">All tags</option>{tags.map((t) => <option key={t}>{t}</option>)}
      </select>
      <button className={btnGhost} onClick={() => setFilters({ q: '', assignees: [], tag: '' })}>Clear filters</button>
    </div>
  );
}
