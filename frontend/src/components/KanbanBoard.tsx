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
import { SortableContext, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import { KanbanColumn } from "@/components/KanbanColumn";
import { KanbanCardPreview } from "@/components/KanbanCardPreview";
import { AISidebar } from "@/components/AISidebar";
import { AddColumnForm } from "@/components/AddColumnForm";
import { FilterBar } from "@/components/FilterBar";
import { BoardStats } from "@/components/BoardStats";
import { ArchivePanel } from "@/components/ArchivePanel";
import { ChangePasswordModal } from "@/components/ChangePasswordModal";
import { createId, moveCard, moveColumn, timeAgo, type BoardData, type ChecklistItem, type Comment, type Priority, type CardFilter } from "@/lib/kanban";
import { saveBoard, renameBoard, deleteBoard } from "@/lib/api";
import { useRef } from "react";
import type { BoardSummary } from "@/lib/api";

type KanbanBoardProps = {
  initialBoard: BoardData;
  boardId: number;
  boardName: string;
  initialUpdatedAt?: string;
  username: string;
  onLogout: () => void;
  onSwitchBoards: () => void;
  onBoardRenamed: (updated: BoardSummary) => void;
  onBoardDeleted: (id: number) => void;
};

export const KanbanBoard = ({
  initialBoard,
  boardId,
  boardName,
  initialUpdatedAt,
  username,
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
  const [filter, setFilter] = useState<CardFilter>({ search: "", priority: null, overdueOnly: false });
  const [editingDescription, setEditingDescription] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState(initialBoard.description ?? "");
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | undefined>(initialUpdatedAt);
  const [confirmImport, setConfirmImport] = useState<BoardData | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

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
      setLastUpdated(new Date().toISOString());
    } catch {
      setBoard(prev);
      setSaveError("Changes could not be saved. Please try again.");
    }
  };

  const columnIds = board.columns.map((c) => c.id);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveCardId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCardId(null);
    if (!over || active.id === over.id) return;

    const activeId = active.id as string;
    const overId = over.id as string;
    const isColumnMove = columnIds.includes(activeId) && columnIds.includes(overId);

    const prev = board;
    const next: BoardData = {
      ...board,
      columns: isColumnMove
        ? moveColumn(board.columns, activeId, overId)
        : moveCard(board.columns, activeId, overId),
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

  const handleArchiveCard = (columnId: string, cardId: string) => {
    const prev = board;
    const next: BoardData = {
      ...board,
      cards: {
        ...board.cards,
        [cardId]: { ...board.cards[cardId], archived: true },
      },
      columns: board.columns.map((col) =>
        col.id === columnId
          ? { ...col, cardIds: col.cardIds.filter((id) => id !== cardId) }
          : col
      ),
      archivedCardIds: [...(board.archivedCardIds ?? []), cardId],
    };
    setBoard(next);
    void persist(prev, next);
  };

  const handleRestoreCard = (cardId: string) => {
    const card = board.cards[cardId];
    if (!card) return;
    const firstColumnId = board.columns[0]?.id;
    if (!firstColumnId) return;
    const prev = board;
    const next: BoardData = {
      ...board,
      cards: {
        ...board.cards,
        [cardId]: { ...card, archived: false },
      },
      columns: board.columns.map((col) =>
        col.id === firstColumnId
          ? { ...col, cardIds: [...col.cardIds, cardId] }
          : col
      ),
      archivedCardIds: (board.archivedCardIds ?? []).filter((id) => id !== cardId),
    };
    setBoard(next);
    void persist(prev, next);
  };

  const handleDeleteArchivedCard = (cardId: string) => {
    const prev = board;
    const next: BoardData = {
      ...board,
      cards: Object.fromEntries(
        Object.entries(board.cards).filter(([id]) => id !== cardId)
      ),
      archivedCardIds: (board.archivedCardIds ?? []).filter((id) => id !== cardId),
    };
    setBoard(next);
    void persist(prev, next);
  };

  const handleMoveCardToColumn = (cardId: string, fromColumnId: string, toColumnId: string) => {
    const prev = board;
    const next: BoardData = {
      ...board,
      columns: board.columns.map((col) => {
        if (col.id === fromColumnId) {
          return { ...col, cardIds: col.cardIds.filter((id) => id !== cardId) };
        }
        if (col.id === toColumnId) {
          return { ...col, cardIds: [...col.cardIds, cardId] };
        }
        return col;
      }),
    };
    setBoard(next);
    void persist(prev, next);
  };

  const handleDuplicateCard = (columnId: string, cardId: string) => {
    const card = board.cards[cardId];
    if (!card) return;
    const col = board.columns.find((c) => c.id === columnId);
    if (!col) return;
    const newId = createId("card");
    const insertAt = col.cardIds.indexOf(cardId) + 1;
    const newCardIds = [...col.cardIds];
    newCardIds.splice(insertAt, 0, newId);
    const prev = board;
    const next: BoardData = {
      ...board,
      cards: {
        ...board.cards,
        [newId]: { ...card, id: newId, title: `Copy of ${card.title}`, archived: false },
      },
      columns: board.columns.map((c) =>
        c.id === columnId ? { ...c, cardIds: newCardIds } : c
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
    labels: string[],
    checklist: ChecklistItem[],
    comments: Comment[],
    color: string | null,
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
          labels,
          checklist,
          comments,
          color,
        },
      },
    };
    setBoard(next);
    void persist(prev, next);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string) as unknown;
        if (
          !parsed ||
          typeof parsed !== "object" ||
          !Array.isArray((parsed as Record<string, unknown>).columns) ||
          typeof (parsed as Record<string, unknown>).cards !== "object"
        ) {
          setSaveError("Import failed: file does not contain a valid board.");
          return;
        }
        setConfirmImport(parsed as BoardData);
      } catch {
        setSaveError("Import failed: file is not valid JSON.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleConfirmImport = async () => {
    if (!confirmImport) return;
    const prev = board;
    setBoard(confirmImport);
    setConfirmImport(null);
    void persist(prev, confirmImport);
  };

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(board, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${currentBoardName.replace(/\s+/g, "-").toLowerCase()}-board.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveDescription = () => {
    setEditingDescription(false);
    const desc = descriptionDraft.trim() || null;
    const prev = board;
    const next: BoardData = { ...board, description: desc };
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
              {editingDescription ? (
                <input
                  autoFocus
                  value={descriptionDraft}
                  onChange={(e) => setDescriptionDraft(e.target.value)}
                  onBlur={handleSaveDescription}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveDescription();
                    if (e.key === "Escape") { setEditingDescription(false); setDescriptionDraft(board.description ?? ""); }
                  }}
                  placeholder="Add a board description..."
                  className="mt-1 w-full max-w-sm rounded-lg border border-[var(--stroke)] bg-[var(--surface)] px-2.5 py-1 text-sm text-[var(--navy-dark)] outline-none focus:border-[var(--primary-blue)] placeholder:text-[var(--gray-text)]"
                />
              ) : (
                <p
                  className="mt-1 cursor-pointer text-sm text-[var(--gray-text)] hover:text-[var(--navy-dark)]"
                  title="Click to edit description"
                  onClick={() => setEditingDescription(true)}
                >
                  {board.description || "Add a description..."}
                </p>
              )}
              {lastUpdated && (
                <p className="mt-1 text-xs text-[var(--gray-text)]">
                  Last updated {timeAgo(lastUpdated)}
                </p>
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
                onClick={handleExportJson}
                className="rounded-xl border border-[var(--stroke)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--gray-text)] transition hover:border-[var(--primary-blue)] hover:text-[var(--primary-blue)]"
              >
                Export JSON
              </button>
              <button
                type="button"
                onClick={() => importInputRef.current?.click()}
                className="rounded-xl border border-[var(--stroke)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--gray-text)] transition hover:border-[var(--primary-blue)] hover:text-[var(--primary-blue)]"
              >
                Import JSON
              </button>
              <input
                ref={importInputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={handleImportFile}
                aria-label="Import board JSON"
              />
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowProfileMenu((v) => !v)}
                  aria-label="Profile menu"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--navy-dark)] font-display text-sm font-semibold text-white transition hover:opacity-80"
                >
                  {username[0]?.toUpperCase() ?? "?"}
                </button>
                {showProfileMenu && (
                  <div className="absolute right-0 top-full z-20 mt-1 min-w-[160px] overflow-hidden rounded-xl border border-[var(--stroke)] bg-white shadow-lg">
                    <button
                      type="button"
                      onClick={() => { setShowProfileMenu(false); setShowChangePassword(true); }}
                      className="block w-full px-4 py-2.5 text-left text-sm text-[var(--navy-dark)] hover:bg-[var(--surface)]"
                    >
                      Change password
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowProfileMenu(false); onLogout(); }}
                      className="block w-full px-4 py-2.5 text-left text-sm text-[var(--navy-dark)] hover:bg-[var(--surface)]"
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>
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
          <BoardStats board={board} />
        </header>

        <FilterBar filter={filter} onChange={setFilter} />

        <div className="flex items-start gap-6">
          <div className="min-w-0 flex-1 overflow-x-auto">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={columnIds} strategy={horizontalListSortingStrategy}>
                <section className="flex items-start gap-4 pb-2">
                  {board.columns.map((column) => (
                    <div key={column.id} className="min-w-[220px] flex-1">
                      <KanbanColumn
                        column={column}
                        cards={column.cardIds.flatMap((cardId) => {
                          const card = board.cards[cardId];
                          return card ? [card] : [];
                        })}
                        otherColumns={board.columns
                          .filter((c) => c.id !== column.id)
                          .map((c) => ({ id: c.id, title: c.title }))}
                        filter={filter}
                        onRename={handleRenameColumn}
                        onAddCard={handleAddCard}
                        onEditCard={handleEditCard}
                        onArchiveCard={handleArchiveCard}
                        onDuplicateCard={handleDuplicateCard}
                        onMoveCardToColumn={handleMoveCardToColumn}
                        onDeleteColumn={handleDeleteColumn}
                      />
                    </div>
                  ))}
                  <AddColumnForm onAdd={handleAddColumn} />
                </section>
              </SortableContext>
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

        {(board.archivedCardIds ?? []).length > 0 && (
          <ArchivePanel
            archivedCards={(board.archivedCardIds ?? []).flatMap((id) => {
              const card = board.cards[id];
              return card ? [card] : [];
            })}
            onRestore={handleRestoreCard}
            onDelete={handleDeleteArchivedCard}
          />
        )}
      </main>

      {confirmImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-[var(--stroke)] bg-white p-6 shadow-xl">
            <p className="font-display text-lg font-semibold text-[var(--navy-dark)]">
              Replace board?
            </p>
            <p className="mt-2 text-sm text-[var(--gray-text)]">
              This will overwrite all current cards and columns with the imported data. This action cannot be undone.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => void handleConfirmImport()}
                className="rounded-xl bg-[var(--primary-blue)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
              >
                Replace board
              </button>
              <button
                type="button"
                onClick={() => setConfirmImport(null)}
                className="rounded-xl border border-[var(--stroke)] px-4 py-2 text-sm font-semibold text-[var(--gray-text)] transition hover:border-[var(--navy-dark)]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showChangePassword && (
        <ChangePasswordModal onClose={() => setShowChangePassword(false)} />
      )}
    </div>
  );
};
