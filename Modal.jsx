import { useEffect, useRef } from 'react';

// Thin wrapper around the native <dialog> element (focus trap, Esc to close, backdrop for free).
export default function Modal({ onClose, children }) {
  const ref = useRef(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal(); // unmounting removes the dialog, so no cleanup is needed
  }, []);
  return (
    <dialog ref={ref} onClose={onClose}
      onClick={(e) => { if (e.target === ref.current) onClose(); }}
      className="m-auto w-[min(560px,calc(100vw-24px))] rounded-2xl border border-line bg-surface p-0 shadow-2xl">
      {children}
    </dialog>
  );
}
