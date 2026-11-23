import { useEffect, useState } from 'react';
import { useBoard } from '../context/BoardContext.jsx';
import { FIB, cardsIn, col, currentDay, isDone, sprintLength, totals } from '../lib/sprintLogic.js';
import { addDays, today } from '../lib/util.js';
import { btn, btnGhost, btnPrimary, input, label, panel, tile } from '../ui.js';
import Avatar from '../components/Avatar.jsx';
import Modal from '../components/Modal.jsx';

export default function PlannerPage() {
  const { state, updateSprint, setDay, setWip, setPoints, completeSprint, reset, notify, exportJson, importJson } = useBoard();
  const sp = state.sprint, t = totals(state), day = currentDay(state), len = sprintLength(state);
  const [form, setForm] = useState({ name: sp.name, goal: sp.goal, start: sp.start, end: sp.end });
  const [closing, setClosing] = useState(false);
  useEffect(() => setForm({ name: sp.name, goal: sp.goal, start: sp.start, end: sp.end }), [sp.id, sp.name, sp.goal, sp.start, sp.end]);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const pace = (t.remaining / Math.max(1, len - day + 1)).toFixed(1);

  const saveSprint = (e) => {
    e.preventDefault();
    if (updateSprint({ ...form, name: form.name.trim() })) notify('Sprint saved');
  };

  return (
    <>
      <div className="mb-4"><h1 className="text-[26px] font-bold">Sprint Planner</h1><p className="text-muted">Set the sprint window, estimate stories and tune WIP limits.</p></div>
      <div className="mb-4 grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-3">
        {[[t.total, 'Planned points'], [t.done, 'Completed points'], [t.remaining, 'Remaining'], [t.pct + '%', 'Completion'], [pace, 'Pts/day needed']].map(([n, l]) =>
          <div key={l} className={tile}><b className="block text-2xl leading-tight">{n}</b><span className="text-[13px] text-muted">{l}</span></div>)}
      </div>

      <div className="mb-4 grid grid-cols-[repeat(auto-fit,minmax(min(340px,100%),1fr))] items-start gap-4">
        <form onSubmit={saveSprint} className={`${panel} !mb-0`}>
          <h2 className="mb-3 text-lg font-bold">Active sprint</h2>
          <label className={label}>Name<input className={input} required maxLength={60} value={form.name} onChange={set('name')} /></label>
          <label className={label}>Goal<input className={input} maxLength={160} value={form.goal} onChange={set('goal')} /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className={label}>Start date<input type="date" required className={input} value={form.start} onChange={set('start')} /></label>
            <label className={label}>End date<input type="date" required className={input} value={form.end} onChange={set('end')} /></label>
          </div>
          <p className="text-sm text-muted">Sprint length: <b>{len} days</b> · currently <b>Day {day}</b> {state.dayOverride != null ? '(demo clock)' : '(real date)'}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button type="button" className={btnGhost} disabled={day <= 1} onClick={() => setDay(day - 1)}>◀ Day</button>
            <button type="button" className={btnGhost} disabled={day >= len} onClick={() => setDay(day + 1)}>Day ▶</button>
            {state.dayOverride != null && <button type="button" className={btnGhost} onClick={() => setDay(null)}>Use real date</button>}
            <span className="flex-1" /><button type="submit" className={btnPrimary}>Save sprint</button>
          </div>
        </form>

        <div className={`${panel} !mb-0`}>
          <h2 className="mb-3 text-lg font-bold">WIP limits</h2>
          <p className="mb-2 text-sm text-muted">Leave blank for no limit. Columns turn red when the card count exceeds the limit.</p>
          <table className="w-full text-sm"><tbody>
            {state.columns.map((k) => (
              <tr key={k.id} className="border-b border-line">
                <td className="py-1.5"><span className="mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{ background: k.color, boxShadow: `0 0 8px ${k.color}` }} />{k.name}</td>
                <td className="text-right text-muted">{cardsIn(state, k.id).length} {cardsIn(state, k.id).length === 1 ? 'card' : 'cards'}</td>
                <td className="py-1.5 pl-3"><input type="number" min="1" max="50" className={`${input} !w-[86px]`} placeholder="none" aria-label={`WIP limit for ${k.name}`}
                  value={k.wip ?? ''} onChange={(e) => setWip(k.id, parseInt(e.target.value, 10) || 0)} /></td>
              </tr>))}
          </tbody></table>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button className={btn} onClick={() => setClosing(true)}>Complete sprint &amp; start new…</button>
            <span className="flex-1" />
            <button className={`${btnGhost} !text-danger`} onClick={() => { if (confirm('Reset everything to the sample Sprint 14 data?')) { reset(); notify('Demo data restored'); } }}>Reset demo data</button>
          </div>
        </div>
      </div>

      <div className={panel}>
        <h2 className="mb-2 text-lg font-bold">Backup</h2>
        <p className="mb-3 text-sm text-muted">Download the whole board as JSON, or restore one. Imported files are validated before they are accepted.</p>
        <div className="flex flex-wrap items-center gap-2">
          <button className={btn} onClick={exportJson}>⬇ Export JSON</button>
          <label className={`${btn} inline-block`}>⬆ Import JSON
            <input type="file" accept="application/json,.json" className="hidden" data-testid="import-file"
              onChange={async (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) importJson(await f.text()); }} />
          </label>
        </div>
      </div>

      <div className={panel}>
        <h2 className="mb-3 text-lg font-bold">Story point estimates</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-[13px] text-muted"><th className="p-1.5">ID</th><th className="p-1.5">Story</th><th className="p-1.5">Column</th><th className="p-1.5">Assignee</th><th className="p-1.5">Points</th></tr></thead>
            <tbody>
              {state.cards.map((c) => (
                <tr key={c.id} className="border-b border-line whitespace-nowrap">
                  <td className="p-1.5 font-mono text-[12.5px] text-muted">{c.id}</td><td className="p-1.5">{c.title}</td>
                  <td className="p-1.5">{col(state, c.colId).name}</td><td className="p-1.5"><Avatar id={c.assignee} /></td>
                  <td className="p-1.5"><select className={`${input} !w-20`} aria-label={`Points for ${c.title}`} value={c.points} onChange={(e) => setPoints(c.id, Number(e.target.value))}>{FIB.map((n) => <option key={n}>{n}</option>)}</select></td>
                </tr>))}
            </tbody>
          </table>
        </div>
      </div>

      {closing && <CompleteSprintModal onClose={() => setClosing(false)} onConfirm={(n) => { const ok = completeSprint(n); if (ok) notify('New sprint started'); return ok; }} />}
    </>
  );
}

function CompleteSprintModal({ onClose, onConfirm }) {
  const { state } = useBoard();
  const left = state.cards.filter((c) => !isDone(state, c.colId));
  const start = today();
  const [f, setF] = useState({ name: `Sprint ${state.sprint.id + 1}`, goal: '', start, end: addDays(start, 9) });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = (e) => {
    e.preventDefault();
    if (onConfirm(f)) onClose(); // invalid input keeps the dialog open (error shown as a toast)
  };
  return (
    <Modal onClose={onClose}>
      <form onSubmit={submit} className="p-[22px]">
        <h2 className="mb-2 text-lg font-bold">Complete {state.sprint.name}</h2>
        <p className="mb-3 text-muted">Velocity recorded: <b>{totals(state).done} pts</b>. Finished cards are archived; <b>{left.length} unfinished card(s)</b> carry over.</p>
        <label className={label}>Next sprint name<input className={input} required maxLength={60} value={f.name} onChange={set('name')} /></label>
        <label className={label}>Goal<input className={input} maxLength={160} value={f.goal} onChange={set('goal')} placeholder="What should this sprint achieve?" /></label>
        <div className="grid grid-cols-2 gap-3">
          <label className={label}>Start<input type="date" required className={input} value={f.start} onChange={set('start')} /></label>
          <label className={label}>End<input type="date" required className={input} value={f.end} onChange={set('end')} /></label>
        </div>
        <div className="mt-2 flex justify-end gap-2"><button type="button" className={btnGhost} onClick={onClose}>Cancel</button><button className={btnPrimary}>Start new sprint</button></div>
      </form>
    </Modal>
  );
}
