import { NavLink } from 'react-router-dom';
import { useBoard } from '../context/BoardContext.jsx';
import { currentDay, sprintLength } from '../lib/sprintLogic.js';

const links = [
  ['/board', 'Kanban Board'], ['/planner', 'Sprint Planner'], ['/burndown', 'Burndown Chart'],
  ['/insights', 'Insights'], ['/retro', 'Retrospective'],
];

export default function Navbar() {
  const { state, theme, setTheme, undo, canUndo, sync, source } = useBoard();
  const badge = { synced: ['● Synced', 'text-ok'], local: [source === 'server' ? '● Synced' : '● Saved locally', 'text-muted'], offline: ['⚠ Offline', 'text-warn'], error: ['⚠ Save problem', 'text-danger'] }[sync.status] || ['', ''];
  return (
    <header className="sticky top-0 z-20 flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-line bg-surface px-3 py-2 md:px-5">
      <div className="text-lg font-extrabold"><span className="text-accent">▦</span> CardCascade <small className="ml-1 font-medium text-muted">SprintSense</small></div>
      <nav className="order-3 flex w-full gap-1 overflow-x-auto md:order-none md:w-auto md:flex-1" aria-label="Main">
        {links.map(([to, text]) => (
          <NavLink key={to} to={to}
            className={({ isActive }) => `whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-semibold no-underline transition ${isActive ? 'bg-accent text-onaccent' : 'text-muted hover:bg-surface2 hover:text-ink'}`}>
            {text}
          </NavLink>
        ))}
      </nav>
      <div className="ml-auto flex items-center gap-2.5">
        <span className={`hidden text-[13px] font-semibold sm:inline ${badge[1]}`} title={sync.message || 'Data storage status'} data-testid="sync">{badge[0]}</span>
        <button className="cursor-pointer rounded-[10px] border border-line px-2.5 py-1 text-ink disabled:cursor-not-allowed disabled:opacity-40" disabled={!canUndo} onClick={undo} aria-label="Undo last change" title="Undo (Ctrl+Z)">↶ Undo</button>
        <span className="whitespace-nowrap rounded-full border border-line bg-surface2 px-3 py-0.5 text-[13px] text-muted">
          {state.sprint.name.split(':')[0]} · Day {currentDay(state)}/{sprintLength(state)}
        </span>
        <button className="cursor-pointer rounded-[10px] border border-line px-2.5 py-1 text-ink" aria-label="Toggle dark / light theme" title="Toggle theme"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>🌓</button>
      </div>
    </header>
  );
}
