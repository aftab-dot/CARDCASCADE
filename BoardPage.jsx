import { useState } from 'react';
import { useBoard } from '../context/BoardContext.jsx';
import { currentDay, sprintLength, totals } from '../lib/sprintLogic.js';
import { btnPrimary, tile } from '../ui.js';
import CardModal from '../components/CardModal.jsx';
import Column from '../components/Column.jsx';
import Filters from '../components/Filters.jsx';

export default function BoardPage() {
  const { state } = useBoard();
  const [editing, setEditing] = useState(null); // { id } | { colId } | null
  const t = totals(state);
  const tiles = [[t.total, 'Total points'], [t.done, 'Completed'], [t.remaining, 'Remaining'], [`${currentDay(state)}/${sprintLength(state)}`, 'Sprint day'], [t.pct + '%', 'Done']];

  return (
    <>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div><h1 className="text-[26px] font-bold">{state.sprint.name}</h1><p className="text-muted">{state.sprint.goal}</p></div>
        <button className={btnPrimary} onClick={() => setEditing({ colId: 'todo' })}>+ New card</button>
      </div>
      <div className="mb-4 grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-3" data-testid="summary">
        {tiles.map(([n, l]) => <div key={l} className={tile}><b className="block text-2xl leading-tight">{n}</b><span className="text-[13px] text-muted">{l}</span></div>)}
      </div>
      <Filters />
      {/* horizontal scroll with snap alignment keeps the board usable on tablets/phones */}
      <div className="flex snap-x snap-proximity items-start gap-3.5 overflow-x-auto pb-3.5 max-md:snap-mandatory" id="board">
        {state.columns.map((k) => <Column key={k.id} column={k} onEdit={(id) => setEditing({ id })} onAdd={(colId) => setEditing({ colId })} />)}
      </div>
      {editing && <CardModal cardId={editing.id} colId={editing.colId} onClose={() => setEditing(null)} />}
    </>
  );
}
