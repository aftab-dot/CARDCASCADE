import { useBoard } from '../context/BoardContext.jsx';
import { member } from '../lib/sprintLogic.js';
import { initials } from '../lib/util.js';

export default function Avatar({ id, big = false }) {
  const { state } = useBoard();
  const m = member(state, id);
  const size = big ? 'h-[34px] w-[34px] text-[13px]' : 'h-6 w-6 text-[10px]';
  return m
    ? <span className={`inline-grid place-items-center rounded-full font-extrabold text-[#10162a] ${size}`} style={{ background: m.color }} title={m.name}>{initials(m.name)}</span>
    : <span className={`inline-grid place-items-center rounded-full bg-surface2 font-extrabold text-muted ${size}`} title="Unassigned">?</span>;
}
