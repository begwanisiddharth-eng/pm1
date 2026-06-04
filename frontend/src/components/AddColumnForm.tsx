"use client";

import { useState } from "react";

type Props = {
  onAdd: (title: string) => void;
};

export const AddColumnForm = ({ onAdd }: Props) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");

  const handleAdd = () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setTitle("");
    setOpen(false);
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Add column"
        className="flex min-h-[520px] min-w-[200px] flex-shrink-0 flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-[var(--stroke)] p-6 text-[var(--gray-text)] transition hover:border-[var(--primary-blue)] hover:text-[var(--primary-blue)]"
      >
        <span className="text-2xl leading-none">+</span>
        <span className="text-xs font-semibold uppercase tracking-[0.2em]">
          Add column
        </span>
      </button>
    );
  }

  return (
    <div className="flex min-w-[200px] flex-shrink-0 flex-col gap-3 rounded-3xl border border-[var(--primary-blue)] bg-[var(--surface-strong)] p-4 shadow-[var(--shadow)]">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--gray-text)]">
        New column
      </p>
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleAdd();
          if (e.key === "Escape") {
            setOpen(false);
            setTitle("");
          }
        }}
        placeholder="Column name…"
        className="rounded-xl border border-[var(--stroke)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--navy-dark)] placeholder:text-[var(--gray-text)] outline-none focus:border-[var(--primary-blue)] focus:ring-1 focus:ring-[var(--primary-blue)]/30"
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleAdd}
          disabled={!title.trim()}
          className="rounded-xl bg-[var(--primary-blue)] px-4 py-2 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
        >
          Add
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setTitle(""); }}
          className="rounded-xl border border-[var(--stroke)] px-4 py-2 text-xs font-semibold text-[var(--gray-text)] transition hover:border-[var(--navy-dark)] hover:text-[var(--navy-dark)]"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};
