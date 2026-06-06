"use client";

import { useState } from "react";
import { createBoard, type BoardSummary } from "@/lib/api";
import { timeAgo } from "@/lib/kanban";
import { PageBackground } from "@/components/PageBackground";

type Props = {
  boards: BoardSummary[];
  onSelect: (board: BoardSummary) => void;
  onBoardCreated: (board: BoardSummary) => void;
  onLogout: () => void;
  username: string;
};

export const BoardSelector = ({
  boards,
  onSelect,
  onBoardCreated,
  onLogout,
  username,
}: Props) => {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    setLoading(true);
    setCreateError(null);
    try {
      const board = await createBoard(name);
      setNewName("");
      setCreating(false);
      onBoardCreated(board);
    } catch {
      setCreateError("Failed to create board. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen">
      <PageBackground />

      <main className="relative mx-auto max-w-2xl px-6 pb-16 pt-12">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--gray-text)]">
              Project Management
            </p>
            <h1 className="mt-2 font-display text-3xl font-semibold text-[var(--navy-dark)]">
              Your Boards
            </h1>
            <p className="mt-1 text-sm text-[var(--gray-text)]">
              Signed in as{" "}
              <span className="font-semibold text-[var(--navy-dark)]">{username}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="rounded-xl border border-[var(--stroke)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--gray-text)] transition hover:border-[var(--navy-dark)] hover:text-[var(--navy-dark)]"
          >
            Sign out
          </button>
        </header>

        <div className="space-y-3">
          {boards.map((board) => (
            <button
              key={board.id}
              type="button"
              onClick={() => onSelect(board)}
              className="w-full rounded-2xl border border-[var(--stroke)] bg-white/80 p-5 text-left shadow-[var(--shadow)] backdrop-blur transition hover:border-[var(--primary-blue)] hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-[var(--navy-dark)]">{board.name}</p>
                  <p className="mt-1 text-xs text-[var(--gray-text)]">
                    Updated {timeAgo(board.updated_at)}
                  </p>
                </div>
                <span className="text-[var(--primary-blue)]">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path
                      d="M7 4l6 6-6 6"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </div>
            </button>
          ))}

          {creating ? (
            <div className="rounded-2xl border border-[var(--primary-blue)] bg-white/90 p-5 shadow-[var(--shadow)]">
              <p className="mb-3 text-sm font-semibold text-[var(--navy-dark)]">
                New board name
              </p>
              <input
                autoFocus
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleCreate();
                  if (e.key === "Escape") {
                    setCreating(false);
                    setNewName("");
                    setCreateError(null);
                  }
                }}
                placeholder="e.g. Sprint 4, Q2 Roadmap…"
                className="w-full rounded-xl border border-[var(--stroke)] bg-[var(--surface)] px-4 py-2.5 text-sm text-[var(--navy-dark)] placeholder:text-[var(--gray-text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-blue)]/30"
              />
              {createError && (
                <p className="mt-2 text-xs text-red-600">{createError}</p>
              )}
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => void handleCreate()}
                  disabled={!newName.trim() || loading}
                  className="rounded-xl bg-[var(--primary-blue)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
                >
                  {loading ? "Creating…" : "Create"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCreating(false);
                    setNewName("");
                    setCreateError(null);
                  }}
                  className="rounded-xl border border-[var(--stroke)] px-4 py-2 text-sm font-semibold text-[var(--gray-text)] transition hover:border-[var(--navy-dark)] hover:text-[var(--navy-dark)]"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-[var(--stroke)] px-5 py-4 text-sm text-[var(--gray-text)] transition hover:border-[var(--primary-blue)] hover:text-[var(--primary-blue)]"
            >
              <span className="text-lg leading-none">+</span>
              <span>New board</span>
            </button>
          )}
        </div>
      </main>
    </div>
  );
};
