import { useMemo } from 'react';
import { useBoard } from '../context/BoardContext.jsx';
import { burndown, forecast } from '../lib/sprintLogic.js';
import { panel } from '../ui.js';
import { BurndownChart } from '../components/Charts.jsx';

export default function BurndownPage() {
  const { state } = useBoard();
  const b = useMemo(() => burndown(state), [state]);
  const f = useMemo(() => forecast(state), [state]);
  const chartData = useMemo(() => ({ ...b, projected: f.projected }), [b, f]);
  const diff = b.remaining - b.ideal[b.day];
  return (
    <>
      <div className="mb-4">
        <h1 className="text-[26px] font-bold">Sprint Burndown</h1>
        <p className="text-muted">{state.sprint.name} · Day {b.day} of {b.len} · <b>{b.remaining}</b> of {b.total} points remaining</p>
      </div>
      <div className={panel}>
        <p className={`mb-2 text-right font-semibold ${diff <= 0.5 ? 'text-ok' : 'text-danger'}`} data-testid="status">
          {diff <= 0.5 ? `On track — ${Math.abs(diff).toFixed(1)} pts ${diff < 0 ? 'ahead of' : 'at'} the ideal line` : `Behind — ${diff.toFixed(1)} pts above the ideal line`}
        </p>
        <BurndownChart data={chartData} />
        <p className="mt-2 text-sm text-muted">Y-axis: remaining story points · X-axis: sprint day. Hover or tap the chart for exact values.</p>
      </div>
      <div className={panel} data-testid="forecast">
        <h2 className="mb-2 text-lg font-bold">Sprint forecast</h2>
        <p className="text-sm text-muted">Extrapolates your average burn rate so far ({f.rate} pts/day) to the end of the sprint.</p>
        <p className={`mt-2 font-semibold ${f.onTrack ? 'text-ok' : 'text-danger'}`}>
          {f.onTrack
            ? (b.remaining === 0 ? 'All points are done.' : `On pace to finish around day ${f.finishDay} of ${b.len}.`)
            : f.finishDay === null ? 'No progress yet, so a finish day cannot be projected.' : `At risk: projected to finish around day ${f.finishDay}, about ${f.shortBy} pts short at day ${b.len}.`}
        </p>
      </div>

      <div className={panel}>
        <h2 className="mb-3 text-lg font-bold">Daily data</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="burn-table">
            <thead><tr className="text-[13px] text-muted"><th className="p-1.5 text-left">Day</th>{b.labels.map((l) => <th key={l} className="p-1.5 text-right">{l}</th>)}</tr></thead>
            <tbody>
              <tr className="border-t border-line"><td className="p-1.5">Ideal</td>{b.ideal.map((v, i) => <td key={i} className="p-1.5 text-right">{+v.toFixed(1)}</td>)}</tr>
              <tr className="border-t border-line"><td className="p-1.5">Actual</td>{b.actual.map((v, i) => <td key={i} className="p-1.5 text-right">{v ?? '–'}</td>)}</tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
