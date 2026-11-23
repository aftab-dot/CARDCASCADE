import { useRef, useState } from 'react';
import { useBoard } from '../context/BoardContext.jsx';
import { cardsIn, wipStatus } from '../lib/sprintLogic.js';
import Card from './Card.jsx';

const PAGE = 25;

export default function Column({ column, onEdit, onAdd }) {
  const { state, draggingCardId, setDraggingCardId, moveCard, matches } = useBoard();
  const [over, setOver] = useState(null); // { before: cardId | null } while a card is hovering
  const bodyRef = useRef(null);
  const [visible, setVisible] = useState(PAGE); // per-column pagination for large boards

  const all = cardsIn(state, column.id);
  const shown = all.filter(matches);
  const w = wipStatus(state, column.id);
  const pts = all.reduce((a, c) => a + c.points, 0);

  // which visible card should the dragged card be inserted before? (null = at the end)
  const beforeId = (y) => {
    const els = [...bodyRef.current.querySelectorAll('[data-card]')].filter((el) => el.dataset.id !== draggingCardId);
    const hit = els.find((el) => { const r = el.getBoundingClientRect(); return y < r.top + r.height / 2; });
    return hit ? hit.dataset.id : null;
  };

  const badgeCls = w.status === 'over' ? 'border-danger bg-danger text-white'
    : w.status === 'at' ? 'border-warn text-warn' : w.status === 'ok' ? 'border-line text-ok' : 'border-line text-muted';
  const indicator = <div key="ind" className="drop-ind" />;

  return (
    <section className={`col min-w-[250px] max-w-[360px] flex-1 basis-[250px] snap-start rounded-xl border border-line bg-surface max-md:basis-[86vw] ${w.status === 'over' ? 'wip-over' : w.status === 'at' ? 'wip-at' : ''}`}
      style={{ '--col': column.color }} data-col={column.id} aria-label={column.name}>
      <header className="flex items-center gap-2 px-3 pt-2.5 pb-1.5">
        <h3 className="flex-1 text-[15px] font-bold uppercase tracking-wide">{column.name}</h3>
        <span className={`rounded-full border bg-surface2 px-2.5 text-[12.5px] font-bold ${badgeCls}`} title="Work-in-progress limit">
          {w.limit ? `${w.count}/${w.limit}` : w.count}
        </span>
        <span className="text-[13px] text-muted">{pts} pts</span>
        <button className="cursor-pointer rounded-lg border border-line px-2 leading-6 text-ink" aria-label={`Add card to ${column.name}`} onClick={() => onAdd(column.id)}>+</button>
      </header>
      {w.status === 'over' && (
        <div className="mx-2.5 mb-1.5 rounded-lg bg-danger/10 px-2.5 py-1 text-[12.5px] font-semibold text-danger">
          ⚠ WIP limit exceeded — finish work before starting more
        </div>
      )}
      <div ref={bodyRef} data-col-body={column.id}
        className={`col-body min-h-[90px] rounded-b-xl px-2.5 pt-1.5 pb-1.5 transition ${over ? 'drag-over' : ''}`}
        onDragOver={(e) => {
          if (!draggingCardId) return;
          e.preventDefault(); // required, otherwise drop never fires
          e.dataTransfer.dropEffect = 'move';
          const b = beforeId(e.clientY);
          setOver((o) => (o && o.before === b ? o : { before: b }));
        }}
        onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setOver(null); }}
        onDrop={(e) => {
          if (!draggingCardId) return;
          e.preventDefault();
          const b = beforeId(e.clientY), id = draggingCardId;
          setOver(null); setDraggingCardId(null);
          moveCard(id, column.id, b);
        }}>
        {shown.slice(0, visible).map((c) => (
          <div key={c.id}>
            {over && over.before === c.id && indicator}
            <Card card={c} onEdit={onEdit} />
          </div>
        ))}
        {over && over.before === null && indicator}
        {shown.length > visible && (
          <button className="mb-2 w-full cursor-pointer rounded-[10px] border border-dashed border-line py-1.5 text-sm text-muted hover:border-accent hover:text-ink"
            onClick={() => setVisible((v) => v + PAGE)}>Show {Math.min(PAGE, shown.length - visible)} more ({shown.length - visible} hidden)</button>
        )}
        {!shown.length && !over && <div className="rounded-[10px] border border-dashed border-line py-5 text-center text-sm text-muted">Drop cards here</div>}
      </div>
    </section>
  );
}
