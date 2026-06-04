"use client";

import { useEffect } from "react";

type ShortcutsModalProps = {
  onClose: () => void;
};

const SHORTCUTS: { context: string; key: string; action: string }[] = [
  { context: "Global", key: "?", action: "Open this shortcut reference" },
  { context: "Global", key: "Escape", action: "Close open modal or cancel active edit" },
  { context: "Card edit", key: "Enter (title field)", action: "Save card" },
  { context: "Card edit", key: "Escape", action: "Cancel edit" },
  { context: "New card form", key: "Enter", action: "Submit" },
  { context: "New card form", key: "Escape", action: "Dismiss form" },
  { context: "Add column form", key: "Enter", action: "Submit" },
  { context: "Add column form", key: "Escape", action: "Dismiss form" },
  { context: "Board name", key: "Enter", action: "Save rename" },
  { context: "Board name", key: "Escape", action: "Cancel rename" },
  { context: "AI sidebar", key: "Enter", action: "Send message" },
  { context: "AI sidebar", key: "Shift+Enter", action: "New line" },
  { context: "Column rename", key: "Enter", action: "Save rename" },
];

export const ShortcutsModal = ({ onClose }: ShortcutsModalProps) => {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
      aria-label="Shortcuts modal backdrop"
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-[var(--stroke)] bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard shortcuts"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-[var(--navy-dark)]">
            Keyboard Shortcuts
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close shortcuts modal"
            className="rounded-lg border border-transparent p-1 text-[var(--gray-text)] transition hover:border-[var(--stroke)] hover:text-[var(--navy-dark)]"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-[var(--stroke)]">
              <th className="pb-2 text-left text-xs font-semibold uppercase tracking-[0.12em] text-[var(--gray-text)]">Context</th>
              <th className="pb-2 text-left text-xs font-semibold uppercase tracking-[0.12em] text-[var(--gray-text)]">Key</th>
              <th className="pb-2 text-left text-xs font-semibold uppercase tracking-[0.12em] text-[var(--gray-text)]">Action</th>
            </tr>
          </thead>
          <tbody>
            {SHORTCUTS.map((row, i) => (
              <tr key={i} className="border-b border-[var(--stroke)] last:border-0">
                <td className="py-2 pr-4 text-[var(--gray-text)]">{row.context}</td>
                <td className="py-2 pr-4">
                  <kbd className="rounded border border-[var(--stroke)] bg-[var(--surface)] px-1.5 py-0.5 font-mono text-xs text-[var(--navy-dark)]">
                    {row.key}
                  </kbd>
                </td>
                <td className="py-2 text-[var(--navy-dark)]">{row.action}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
