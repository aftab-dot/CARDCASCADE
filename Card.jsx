import { useBoard } from '../context/BoardContext.jsx';
import { hue } from '../lib/util.js';
import Avatar from './Avatar.jsx';

export default function Card({ card, onEdit }) {
  const { state, draggingCardId, setDraggingCardId, moveCard } = useBoard();
  const dragging = draggingCardId === card.id;

  return (
    <article
      data-card data-id={card.id} draggable tabIndex={0}
      aria-label={`${card.title}, ${card.points} points`}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', card.id); // Firefox needs data to start a drag
        setTimeout(() => setDraggingCardId(card.id), 0); // style it after the drag image is captured
      }}
      onDragEnd={() => setDraggingCardId(null)}
      onClick={(e) => { if (!e.target.closest('select')) onEdit(card.id); }}
      onKeyDown={(e) => { if (e.key === 'Enter' && e.target === e.currentTarget) onEdit(card.id); }}
      className={`kcard mb-2 cursor-grab rounded-[10px] border border-line bg-surface2 px-3 py-2.5 transition hover:-translate-y-0.5 hover:shadow-lg ${dragging ? 'scale-[.97] opacity-35' : ''}`}>
      <div className="mb-1 flex items-center justify-between">
        <span className="font-mono text-[11.5px] text-muted">{card.id}</span>
        <span className="min-w-6 rounded-full bg-accent px-[7px] text-center text-[13px] font-extrabold text-onaccent" title="Story points">{card.points}</span>
      </div>
      <h4 className="mb-1.5 text-[14.5px] font-semibold">{card.title}</h4>
      <div className="mb-2 flex min-h-1 flex-wrap gap-1">
        {card.tags.map((t) => <span key={t} className="tag rounded-full px-2 text-[11px] font-semibold" style={{ '--h': hue(t) }}>{t}</span>)}
      </div>
      <div className="flex items-center justify-between gap-2">
        <Avatar id={card.assignee} />
        {/* touch-friendly fallback: HTML5 drag & drop doesn't work on touch screens */}
        <select className="move-select w-auto rounded-lg border border-line bg-page px-1.5 py-0.5 text-[13px] text-ink"
          aria-label={`Move ${card.title} to column`} value={card.colId}
          onChange={(e) => moveCard(card.id, e.target.value, null)}>
          {state.columns.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
        </select>
      </div>
    </article>
  );
}
