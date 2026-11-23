import { useState } from 'react';
import { useBoard } from '../context/BoardContext.jsx';
import { btn, btnPrimary, input } from '../ui.js';

const LISTS = [['well', 'What Went Well', '👍', 'border-t-ok'], ['improve', 'What Needs Improvement', '🔧', 'border-t-warn'], ['actions', 'Action Items', '🎯', 'border-t-accent']];

export default function RetroPage() {
  const { state, autoRetro, notify } = useBoard();
  return (
    <>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div><h1 className="text-[26px] font-bold">Sprint Retrospective</h1><p className="text-muted">{state.sprint.name}</p></div>
        <button className={btnPrimary} onClick={() => { autoRetro(); notify('Retrospective generated from sprint data'); }}>✨ Auto-generate from sprint data</button>
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(290px,100%),1fr))] items-start gap-4">
        {LISTS.map(([k, title, icon, border]) => <RetroColumn key={k} list={k} title={title} icon={icon} border={border} />)}
      </div>
    </>
  );
}

function RetroColumn({ list, title, icon, border }) {
  const { state, addRetro, delRetro, voteRetro, toggleAction } = useBoard();
  const [text, setText] = useState('');
  const items = state.retro[list];
  return (
    <section className={`elev rounded-xl border border-line border-t-4 bg-surface p-3.5 ${border}`}>
      <h3 className="font-bold">{icon} {title} <small className="font-medium text-muted">{items.length}</small></h3>
      <ul className="my-2.5 flex list-none flex-col gap-2 p-0">
        {items.map((i) => (
          <li key={i.id} className="flex items-start gap-2 rounded-[10px] border border-line bg-surface2 px-2.5 py-2">
            {list === 'actions' && <input type="checkbox" className="mt-1" checked={!!i.done} onChange={() => toggleAction(i.id)} aria-label="Mark done" />}
            <span className={`flex-1 ${i.done ? 'text-muted line-through' : ''}`}>{i.text}{i.auto && <em className="ml-1.5 rounded-full bg-accent px-1.5 text-[11px] not-italic text-onaccent">auto</em>}</span>
            {list !== 'actions' && <button className="cursor-pointer text-[13px] text-muted hover:text-accent" aria-label="Upvote" onClick={() => voteRetro(list, i.id)}>▲ {i.votes}</button>}
            <button className="cursor-pointer text-[13px] text-muted hover:text-danger" aria-label="Delete" onClick={() => delRetro(list, i.id)}>✕</button>
          </li>))}
        {!items.length && <li className="rounded-[10px] border border-dashed border-line py-2 text-center text-muted">Nothing yet</li>}
      </ul>
      <form className="flex gap-1.5" onSubmit={(e) => { e.preventDefault(); if (text.trim()) { addRetro(list, text.trim()); setText(''); } }}>
        <input className={input} maxLength={200} required placeholder="Add a note…" aria-label={`New ${title} note`} value={text} onChange={(e) => setText(e.target.value)} />
        <button className={btn}>Add</button>
      </form>
    </section>
  );
}
