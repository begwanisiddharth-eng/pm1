"use client";

import { useState } from "react";
import type { Card } from "@/lib/kanban";

type ArchivePanelProps = {
  archivedCards: Card[];
  onRestore: (cardId: string) => void;
  onDelete: (cardId: string) => void;
};

export const ArchivePanel = ({ archivedCards, onRestore, onDelete }: ArchivePanelProps) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="mx-6 mb-8 rounded-2xl border border-[var(--stroke)] bg-white/80 backdrop-blur">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--gray-text)] hover:text-[var(--navy-dark)]"
        aria-expanded={open}
      >
        <span>Archive ({archivedCards.length})</span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          className={open ? "rotate-180 transition-transform" : "transition-transform"}
        >
          <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="border-t border-[var(--stroke)] px-5 pb-4 pt-3">
          {archivedCards.length === 0 ? (
            <p className="text-xs text-[var(--gray-text)]">No archived cards.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {archivedCards.map((card) => (
                <li
                  key={card.id}
                  className="flex items-center justify-between gap-4 rounded-xl border border-[var(--stroke)] bg-[var(--surface)] px-4 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[var(--navy-dark)]">{card.title}</p>
                    {card.details && (
                      <p className="truncate text-xs text-[var(--gray-text)]">{card.details}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => onRestore(card.id)}
                      className="rounded-lg border border-[var(--primary-blue)] px-2.5 py-1 text-xs font-semibold text-[var(--primary-blue)] transition hover:bg-[var(--primary-blue)] hover:text-white"
                    >
                      Restore
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(card.id)}
                      className="rounded-lg border border-[var(--stroke)] px-2.5 py-1 text-xs font-semibold text-[var(--gray-text)] transition hover:border-red-400 hover:text-red-500"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
