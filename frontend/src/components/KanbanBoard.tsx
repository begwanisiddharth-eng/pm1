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
import { createId, moveCard, type BoardData } from "@/lib/kanban";
import { saveBoard } from "@/lib/api";

type KanbanBoardProps = {
  initialBoard: BoardData;
  onLogout: () => void;
};

export const KanbanBoard = ({ initialBoard, onLogout }: KanbanBoardProps) => {
  const [board, setBoard] = useState<BoardData>(initialBoard);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  const cardsById = board.cards;

  const persist = async (prev: BoardData, next: BoardData) => {
    try {
      await saveBoard(next);
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
    const next: BoardData = {
      ...board,
      columns: moveCard(board.columns, active.id as string, over.id as string),
    };
    setBoard(next);
    void persist(board, next);
  };

  const handleRenameColumn = (columnId: string, title: string) => {
    const next: BoardData = {
      ...board,
      columns: board.columns.map((col) =>
        col.id === columnId ? { ...col, title } : col
      ),
    };
    setBoard(next);
    void persist(board, next);
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

  const handleEditCard = (cardId: string, title: string, details: string) => {
    const prev = board;
    const next: BoardData = {
      ...board,
      cards: {
        ...board.cards,
        [cardId]: { ...board.cards[cardId], title, details },
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

  const activeCard = activeCardId ? cardsById[activeCardId] : null;

  return (
    <div className="relative">
      {/* Clipping wrapper keeps decorative gradients from causing a scrollbar
          without making this div an overflow container that breaks sticky */}
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
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--gray-text)]">
                Single Board Kanban
              </p>
              <h1 className="mt-3 font-display text-4xl font-semibold text-[var(--navy-dark)]">
                Kanban Studio
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--gray-text)]">
                Keep momentum visible. Rename columns, drag cards between stages,
                and capture quick notes without getting buried in settings.
              </p>
            </div>
            <div className="flex items-start gap-4">
              <div className="rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--gray-text)]">
                  Focus
                </p>
                <p className="mt-2 text-lg font-semibold text-[var(--primary-blue)]">
                  One board. Five columns. Zero clutter.
                </p>
              </div>
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
          <div className="flex-1 min-w-0">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <section className="grid gap-4 grid-cols-5">
                {board.columns.map((column) => (
                  <KanbanColumn
                    key={column.id}
                    column={column}
                    cards={column.cardIds.map((cardId) => board.cards[cardId])}
                    onRename={handleRenameColumn}
                    onAddCard={handleAddCard}
                    onDeleteCard={handleDeleteCard}
                    onEditCard={handleEditCard}
                  />
                ))}
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
          <AISidebar onBoardUpdate={handleAiBoardUpdate} />
        </div>
      </main>
    </div>
  );
};
