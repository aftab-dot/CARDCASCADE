import { useMemo } from 'react';
import { useBoard } from '../context/BoardContext.jsx';
import { distribution, totals } from '../lib/sprintLogic.js';
import { panel } from '../ui.js';
import { DistributionChart, VelocityChart } from '../components/Charts.jsx';

export default function InsightsPage() {
  const { state } = useBoard();
  const dist = useMemo(() => distribution(state), [state]);
  const slices = useMemo(() => dist.filter((d) => d.value > 0), [dist]);
  const total = dist.reduce((a, d) => a + d.value, 0) || 1;
  const h = state.history, t = totals(state);
  const avg = h.length ? h.reduce((a, x) => a + x.velocity, 0) / h.length : 0;
  const labels = useMemo(() => [...h.map((x) => x.name), state.sprint.name.split(':')[0]], [h, state.sprint.name]);
  const values = useMemo(() => [...h.map((x) => x.velocity), t.done], [h, t.done]);

  return (
    <>
      <div className="mb-4"><h1 className="text-[26px] font-bold">Team Insights</h1><p className="text-muted">Balance workload and watch velocity over time.</p></div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(340px,100%),1fr))] items-start gap-4">
        <div className={panel}>
          <h2 className="mb-3 text-lg font-bold">Story points by developer</h2>
          <DistributionChart slices={slices} />
          <ul className="my-3 list-none p-0">
            {dist.map((d) => {
              const pct = Math.round((d.value / total) * 100);
              return (
                <li key={d.label} className="flex items-center gap-2 py-1">
                  <i className="h-3 w-3 rounded-sm" style={{ background: d.color }} /><span className="flex-1">{d.label}</span>
                  <b className="text-sm font-semibold">{d.value} pts · {pct}%</b>
                  {d.id && pct > 30 && <em className="text-[12.5px] font-bold not-italic text-warn">⚠ heavy load</em>}
                </li>);
            })}
          </ul>
          <p className="text-sm text-muted">Developers above 30% of the sprint's points are flagged to help prevent individual overload.</p>
        </div>
        <div className={panel}>
          <h2 className="mb-3 text-lg font-bold">Sprint velocity trend</h2>
          <VelocityChart labels={labels} values={values} average={+avg.toFixed(1)} />
          <p className="mt-2 text-sm text-muted">Dashed line = average of completed sprints. The lighter bar is the current sprint so far.</p>
        </div>
      </div>
    </>
  );
}
