import { useBoard } from '../context/BoardContext.jsx';

export default function Toast() {
  const { toast } = useBoard();
  return (
    <div role="status" aria-live="polite"
      className={`pointer-events-none fixed bottom-5 left-1/2 z-50 max-w-[92vw] -translate-x-1/2 rounded-full border bg-surface2 px-4 py-2.5 shadow-lg transition-all duration-200 ${toast ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'} ${toast?.kind === 'warn' ? 'border-danger text-danger' : 'border-line text-ink'}`}>
      {toast?.msg}
    </div>
  );
}
