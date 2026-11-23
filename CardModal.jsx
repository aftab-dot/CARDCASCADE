import { useState } from 'react';
import { useBoard } from '../context/BoardContext.jsx';
import { FIB } from '../lib/sprintLogic.js';
import { btnDanger, btnGhost, btnPrimary, input, label } from '../ui.js';
import Modal from './Modal.jsx';

// Card editor: title, description, Fibonacci story points, assignee, tags (+ column)
export default function CardModal({ cardId, colId, onClose }) {
  const { state, saveCard, deleteCard } = useBoard();
  const existing = cardId ? state.cards.find((c) => c.id === cardId) : null;
  const [f, setF] = useState(() => existing
    ? { ...existing, tags: existing.tags.join(', ') }
    : { title: '', desc: '', points: 3, assignee: '', tags: '', colId: colId || 'todo' });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = (e) => {
    e.preventDefault();
    const ok = saveCard({
      id: existing ? existing.id : null, title: f.title.trim(), desc: f.desc.trim(),
      points: Number(f.points), assignee: f.assignee, colId: f.colId,
      tags: [...new Set(f.tags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean))],
    });
    if (ok) onClose(); // validation errors are shown as a toast and keep the dialog open
  };

  return (
    <Modal onClose={onClose}>
      <form onSubmit={submit} className="p-[22px]">
        <h2 className="mb-3 text-lg font-bold">{existing ? `Edit ${existing.id}` : 'New user story'}</h2>
        <label className={label}>Title
          <input className={input} autoFocus required maxLength={120} value={f.title} onChange={set('title')} placeholder="As a user, I want…" />
        </label>
        <label className={label}>Description
          <textarea className={input} rows={3} maxLength={600} value={f.desc} onChange={set('desc')} />
        </label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className={label}>Story points
            <select className={input} value={f.points} onChange={set('points')}>{FIB.map((n) => <option key={n}>{n}</option>)}</select>
          </label>
          <label className={label}>Assignee
            <select className={input} value={f.assignee} onChange={set('assignee')}>
              <option value="">Unassigned</option>
              {state.team.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </label>
          <label className={label}>Column
            <select className={input} value={f.colId} onChange={set('colId')}>{state.columns.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}</select>
          </label>
        </div>
        <label className={label}>Tags <small className="font-normal">(comma separated)</small>
          <input className={input} value={f.tags} onChange={set('tags')} placeholder="frontend, qa" />
        </label>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {existing && <button type="button" className={btnDanger} onClick={() => { if (confirm(`Delete ${existing.id}?`)) { deleteCard(existing.id); onClose(); } }}>Delete</button>}
          <span className="flex-1" />
          <button type="button" className={btnGhost} onClick={onClose}>Cancel</button>
          <button type="submit" className={btnPrimary}>Save card</button>
        </div>
      </form>
    </Modal>
  );
}
