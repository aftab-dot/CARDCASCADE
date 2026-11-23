import { useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import { useBoard } from '../context/BoardContext.jsx';

Chart.register(...registerables);

// Read theme colours from the CSS variables so charts follow dark/light mode.
const themeColors = () => {
  const s = getComputedStyle(document.documentElement);
  const g = (n) => s.getPropertyValue(n).trim();
  return { text: g('--text'), muted: g('--muted'), line: g('--border'), accent: g('--accent'), ok: g('--ok'), warn: g('--warn'), surface: g('--surface-2') };
};

// Generic wrapper: builds a Chart.js chart in an effect and destroys it on cleanup.
function useChart(build, deps) {
  const canvas = useRef(null);
  const { theme } = useBoard();
  useEffect(() => {
    const c = themeColors();
    const chart = new Chart(canvas.current, build(c));
    return () => chart.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, theme]);
  return canvas;
}

const axes = (c, yTitle) => ({
  x: { ticks: { color: c.muted }, grid: { color: c.line } },
  y: { beginAtZero: true, ticks: { color: c.muted }, grid: { color: c.line }, title: yTitle ? { display: true, text: yTitle, color: c.muted } : undefined },
});

// Sprint burndown: ideal burn vs actual remaining story points
export function BurndownChart({ data }) {
  const ref = useChart((c) => ({
    type: 'line',
    data: {
      labels: data.labels.map((d) => 'Day ' + d),
      datasets: [
        { label: 'Ideal burn', data: data.ideal, borderColor: c.ok, borderDash: [7, 5], pointRadius: 0, tension: 0, borderWidth: 2.5 },
        { label: 'Projected (current pace)', data: data.projected, borderColor: c.warn, borderDash: [2, 4], pointRadius: 0, tension: 0, borderWidth: 2 },
        { label: 'Actual remaining', data: data.actual, borderColor: c.accent, backgroundColor: c.accent, pointRadius: 4, pointHoverRadius: 7, tension: 0, borderWidth: 2.5, spanGaps: false },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      scales: axes(c, 'Story points remaining'),
      plugins: { legend: { labels: { color: c.text } } },
    },
  }), [data]);
  return <div className="relative h-[380px]"><canvas ref={ref} role="img" aria-label="Sprint burndown chart: ideal versus actual remaining story points" /></div>;
}

// Story points per developer (doughnut)
export function DistributionChart({ slices }) {
  const ref = useChart((c) => ({
    type: 'doughnut',
    data: { labels: slices.map((s) => s.label), datasets: [{ data: slices.map((s) => s.value), backgroundColor: slices.map((s) => s.color), borderColor: c.surface, borderWidth: 2 }] },
    options: { responsive: true, maintainAspectRatio: false, cutout: '58%', plugins: { legend: { display: false } } },
  }), [slices]);
  return <div className="relative h-[280px]"><canvas ref={ref} role="img" aria-label="Story points per developer" /></div>;
}

// Velocity per sprint (bars) with the historical average as a line
export function VelocityChart({ labels, values, average }) {
  const ref = useChart((c) => ({
    type: 'bar',
    data: {
      labels,
      datasets: [
        { type: 'bar', label: 'Points delivered', data: values, backgroundColor: values.map((_, i) => (i === values.length - 1 ? c.accent + '88' : c.accent)), borderRadius: 6 },
        { type: 'line', label: 'Average', data: values.map(() => average), borderColor: c.muted, borderDash: [5, 4], pointRadius: 0, borderWidth: 2 },
      ],
    },
    options: { responsive: true, maintainAspectRatio: false, scales: axes(c, 'Story points'), plugins: { legend: { labels: { color: c.text } } } },
  }), [labels, values, average]);
  return <div className="relative h-[280px]"><canvas ref={ref} role="img" aria-label="Velocity per sprint" /></div>;
}
