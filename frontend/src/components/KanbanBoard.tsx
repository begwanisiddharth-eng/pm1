"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { KanbanColumn } from "@/components/KanbanColumn";
import { KanbanCardPreview } from "@/components/KanbanCardPreview";
import { AISidebar } from "@/components/AISidebar";
import { AddColumnForm } from "@/components/AddColumnForm";
import { createId, moveCard, type BoardData, type Priority } from "@/lib/kanban";
import { saveBoard, renameBoard, deleteBoard } from "@/lib/api";
import type { BoardSummary } from "@/lib/api";

type KanbanBoardProps = {
  initialBoard: BoardData;
  boardId: number;
  boardName: string;
  onLogout: () => void;
  onSwitchBoards: () => void;
  onBoardRenamed: (updated: BoardSummary) => void;
  onBoardDeleted: (id: number) => void;
};

export const KanbanBoard = ({
  initialBoard,
  boardId,
  boardName,
  onLogout,
  onSwitchBoards,
  onBoardRenamed,
  onBoardDeleted,
}: KanbanBoardProps) => {
  const [board, setBoard] = useState<BoardData>(initialBoard);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [editingBoardName, setEditingBoardName] = useState(false);
  const [boardNameDraft, setBoardNameDraft] = useState(boardName);
  const [currentBoardName, setCurrentBoardName] = useState(boardName);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  const cardsById = board.cards;

  const persist = async (prev: BoardData, next: BoardData) => {
    try {
      await saveBoard(boardId, next);
      setSaveError(null);
    } catch {
      setBoard(prev);
      setSaveError("Changes could not be saved. Please try again.");
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveCardId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCardId(null);
    if (!over || active.id === over.id) return;
    const prev = board;
    const next: BoardData = {
      ...board,
      columns: moveCard(board.columns, active.id as string, over.id as string),
    };
    setBoard(next);
    void persist(prev, next);
  };

  const handleRenameColumn = (columnId: string, title: string) => {
    const prev = board;
    const next: BoardData = {
      ...board,
      columns: board.columns.map((col) =>
        col.id === columnId ? { ...col, title } : col
      ),
    };
    setBoard(next);
    void persist(prev, next);
  };

  const handleAddColumn = (title: string) => {
    const id = createId("col");
    const prev = board;
    const next: BoardData = {
      ...board,
      columns: [...board.columns, { id, title, cardIds: [] }],
    };
    setBoard(next);
    void persist(prev, next);
  };

  const handleDeleteColumn = (columnId: string) => {
    const col = board.columns.find((c) => c.id === columnId);
    if (!col) return;
    const removedCardIds = new Set(col.cardIds);
    const prev = board;
    const next: BoardData = {
      ...board,
      columns: board.columns.filter((c) => c.id !== columnId),
      cards: Object.fromEntries(
        Object.entries(board.cards).filter(([id]) => !removedCardIds.has(id))
      ),
    };
    setBoard(next);
    void persist(prev, next);
  };

  const handleAddCard = (columnId: string, title: string, details: string) => {
    const id = createId("card");
    const prev = board;
    const next: BoardData = {
      ...board,
      cards: {
        ...board.cards,
        [id]: { id, title, details: details || "No details yet." },
      },
      columns: board.columns.map((col) =>
        col.id === columnId
          ? { ...col, cardIds: [...col.cardIds, id] }
          : col
      ),
    };
    setBoard(next);
    void persist(prev, next);
  };

  const handleDeleteCard = (columnId: string, cardId: string) => {
    const prev = board;
    const next: BoardData = {
      ...board,
      cards: Object.fromEntries(
        Object.entries(board.cards).filter(([id]) => id !== cardId)
      ),
      columns: board.columns.map((col) =>
        col.id === columnId
          ? { ...col, cardIds: col.cardIds.filter((id) => id !== cardId) }
          : col
      ),
    };
    setBoard(next);
    void persist(prev, next);
  };

  const handleEditCard = (
    cardId: string,
    title: string,
    details: string,
    priority: Priority | null,
    dueDate: string | null,
  ) => {
    const prev = board;
    const next: BoardData = {
      ...board,
      cards: {
        ...board.cards,
        [cardId]: {
          ...board.cards[cardId],
          title,
          details,
          priority,
          due_date: dueDate,
        },
      },
    };
    setBoard(next);
    void persist(prev, next);
  };

  const handleAiBoardUpdate = (aiBoard: BoardData) => {
    setBoard(aiBoard);
    setSaveError(null);
    // Backend already saved the board during the AI call — no persist() needed
  };

  const handleSaveBoardName = async () => {
    const name = boardNameDraft.trim();
    if (!name || name === currentBoardName) {
      setEditingBoardName(false);
      setBoardNameDraft(currentBoardName);
      return;
    }
    try {
      const updated = await renameBoard(boardId, name);
      setCurrentBoardName(updated.name);
      setBoardNameDraft(updated.name);
      onBoardRenamed(updated);
    } catch {
      setBoardNameDraft(currentBoardName);
    } finally {
      setEditingBoardName(false);
    }
  };

  const handleDeleteBoard = async () => {
    try {
      await deleteBoard(boardId);
      onBoardDeleted(boardId);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Could not delete board.");
      setConfirmDelete(false);
    }
  };

  const activeCard = activeCardId ? cardsById[activeCardId] : null;

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-0 top-0 h-[420px] w-[420px] -translate-x-1/3 -translate-y-1/3 rounded-full bg-[radial-gradient(circle,_rgba(32,157,215,0.25)_0%,_rgba(32,157,215,0.05)_55%,_transparent_70%)]" />
        <div className="absolute bottom-0 right-0 h-[520px] w-[520px] translate-x-1/4 translate-y-1/4 rounded-full bg-[radial-gradient(circle,_rgba(117,57,145,0.18)_0%,_rgba(117,57,145,0.05)_55%,_transparent_75%)]" />
      </div>

      <main className="mx-auto flex flex-col gap-10 px-6 pb-16 pt-12">
        {saveError && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm text-red-600"
          >
            {saveError}
          </div>
        )}

        <header className="flex flex-col gap-6 rounded-[32px] border border-[var(--stroke)] bg-white/80 p-8 shadow-[var(--shadow)] backdrop-blur">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <button
                type="button"
                onClick={onSwitchBoards}
                className="flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.35em] text-[var(--gray-text)] transition hover:text-[var(--primary-blue)]"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path
                    d="M9 3L5 7l4 4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                All boards
              </button>
              {editingBoardName ? (
                <input
                  autoFocus
                  value={boardNameDraft}
                  onChange={(e) => setBoardNameDraft(e.target.value)}
                  onBlur={() => void handleSaveBoardName()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void handleSaveBoardName();
                    if (e.key === "Escape") {
                      setEditingBoardName(false);
                      setBoardNameDraft(currentBoardName);
                    }
                  }}
                  className="mt-3 w-full max-w-sm rounded-xl border border-[var(--primary-blue)] bg-[var(--surface)] px-3 py-1 font-display text-4xl font-semibold text-[var(--navy-dark)] outline-none focus:ring-2 focus:ring-[var(--primary-blue)]/30"
                />
              ) : (
                <h1
                  className="mt-3 cursor-pointer font-display text-4xl font-semibold text-[var(--navy-dark)] hover:text-[var(--primary-blue)]"
                  title="Click to rename"
                  onClick={() => setEditingBoardName(true)}
                >
                  {currentBoardName}
                </h1>
              )}
            </div>
            <div className="flex items-start gap-3">
              {confirmDelete ? (
                <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-2">
                  <span className="text-xs text-red-600">Delete this board?</span>
                  <button
                    type="button"
                    onClick={() => void handleDeleteBoard()}
                    className="rounded-lg bg-red-500 px-3 py-1 text-xs font-semibold text-white hover:bg-red-600"
                  >
                    Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="text-xs text-[var(--gray-text)] hover:text-[var(--navy-dark)]"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="rounded-xl border border-[var(--stroke)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--gray-text)] transition hover:border-red-400 hover:text-red-500"
                >
                  Delete board
                </button>
              )}
              <button
                type="button"
                onClick={onLogout}
                className="rounded-xl border border-[var(--stroke)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--gray-text)] transition hover:border-[var(--navy-dark)] hover:text-[var(--navy-dark)]"
              >
                Sign out
              </button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            {board.columns.map((column) => (
              <div
                key={column.id}
                className="flex items-center gap-2 rounded-full border border-[var(--stroke)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--navy-dark)]"
              >
                <span className="h-2 w-2 rounded-full bg-[var(--accent-yellow)]" />
                {column.title}
              </div>
            ))}
          </div>
        </header>

        <div className="flex items-start gap-6">
          <div className="min-w-0 flex-1 overflow-x-auto">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <section className="flex items-start gap-4 pb-2">
                {board.columns.map((column) => (
                  <div key={column.id} className="min-w-[220px] flex-1">
                    <KanbanColumn
                      column={column}
                      cards={column.cardIds.flatMap((cardId) => {
                        const card = board.cards[cardId];
                        return card ? [card] : [];
                      })}
                      onRename={handleRenameColumn}
                      onAddCard={handleAddCard}
                      onDeleteCard={handleDeleteCard}
                      onEditCard={handleEditCard}
                      onDeleteColumn={handleDeleteColumn}
                    />
                  </div>
                ))}
                <AddColumnForm onAdd={handleAddColumn} />
              </section>
              <DragOverlay>
                {activeCard ? (
                  <div className="w-[260px]">
                    <KanbanCardPreview card={activeCard} />
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          </div>
          <AISidebar boardId={boardId} onBoardUpdate={handleAiBoardUpdate} />
        </div>
      </main>
    </div>
  );
};
