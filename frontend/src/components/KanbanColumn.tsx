"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { CSS } from "@dnd-kit/utilities";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { Card, CardFilter, ChecklistItem, Column, Comment, Priority } from "@/lib/kanban";
import { matchesFilter } from "@/lib/kanban";
import { KanbanCard } from "@/components/KanbanCard";
import { NewCardForm } from "@/components/NewCardForm";

type OtherColumn = { id: string; title: string };

type KanbanColumnProps = {
  column: Column;
  cards: Card[];
  otherColumns: OtherColumn[];
  filter?: CardFilter;
  onRename: (columnId: string, title: string) => void;
  onAddCard: (columnId: string, title: string, details: string) => void;
  onEditCard: (cardId: string, title: string, details: string, priority: Priority | null, dueDate: string | null, labels: string[], checklist: ChecklistItem[], comments: Comment[], color: string | null) => void;
  onArchiveCard: (columnId: string, cardId: string) => void;
  onDuplicateCard: (columnId: string, cardId: string) => void;
  onMoveCardToColumn: (cardId: string, fromColumnId: string, toColumnId: string) => void;
  onDeleteColumn: (columnId: string) => void;
  onSetWipLimit: (columnId: string, limit: number | null) => void;
  onToggleCollapse: (columnId: string) => void;
};

export const KanbanColumn = ({
  column,
  cards,
  otherColumns,
  filter,
  onRename,
  onAddCard,
  onEditCard,
  onArchiveCard,
  onDuplicateCard,
  onMoveCardToColumn,
  onDeleteColumn,
  onSetWipLimit,
  onToggleCollapse,
}: KanbanColumnProps) => {
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({ id: column.id });
  const [titleValue, setTitleValue] = useState(column.title);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editingWipLimit, setEditingWipLimit] = useState(false);
  const [wipDraft, setWipDraft] = useState<string>(column.wipLimit != null ? String(column.wipLimit) : "");

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const visibleCards = filter
    ? cards.filter((card) => matchesFilter(card, filter))
    : cards;

  const wipLimit = column.wipLimit ?? null;
  const isAtLimit = wipLimit !== null && cards.length === wipLimit;
  const isOverLimit = wipLimit !== null && cards.length > wipLimit;
  const isDisabledByWip = isAtLimit || isOverLimit;

  const badgeClass = isOverLimit
    ? "rounded-full px-2 py-0.5 text-xs font-semibold bg-red-50 text-red-600"
    : isAtLimit
    ? "rounded-full px-2 py-0.5 text-xs font-semibold bg-orange-50 text-orange-600"
    : "rounded-full bg-[var(--surface)] px-2 py-0.5 text-xs font-semibold text-[var(--gray-text)]";

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTitleValue(column.title);
  }, [column.title]);

  const handleBlur = () => {
    const trimmed = titleValue.trim();
    if (trimmed && trimmed !== column.title) {
      onRename(column.id, trimmed);
    } else if (!trimmed) {
      setTitleValue(column.title);
    }
  };

  const commitWipLimit = () => {
    const parsed = parseInt(wipDraft, 10);
    if (wipDraft.trim() === "") {
      onSetWipLimit(column.id, null);
    } else if (!isNaN(parsed) && parsed > 0) {
      onSetWipLimit(column.id, parsed);
    } else {
      setWipDraft(column.wipLimit != null ? String(column.wipLimit) : "");
    }
    setEditingWipLimit(false);
  };

  if (column.collapsed) {
    return (
      <section
        ref={setNodeRef}
        style={style}
        className={clsx(
          "flex w-12 cursor-pointer flex-col items-center rounded-3xl border border-[var(--stroke)] bg-[var(--surface-strong)] py-4 shadow-[var(--shadow)] transition",
          isOver && "ring-2 ring-[var(--accent-yellow)]",
          isDragging && "opacity-50"
        )}
        onClick={() => onToggleCollapse(column.id)}
        aria-label={`Expand column ${column.title}`}
        data-testid={`column-${column.id}`}
      >
        <div {...attributes} {...listeners} className="mb-3 h-2 w-6 cursor-grab rounded-full bg-[var(--accent-yellow)] active:cursor-grabbing" title="Drag to reorder column" />
        <span
          className={badgeClass}
          aria-label={`${cards.length} card${cards.length === 1 ? "" : "s"}`}
        >
          {cards.length}
        </span>
        <span
          className="mt-3 flex-1 text-xs font-semibold text-[var(--navy-dark)]"
          style={{ writingMode: "vertical-rl", textOrientation: "mixed", transform: "rotate(180deg)" }}
        >
          {column.title}
        </span>
      </section>
    );
  }

  return (
    <section
      ref={setNodeRef}
      style={style}
      className={clsx(
        "flex min-h-[520px] flex-col rounded-3xl border border-[var(--stroke)] bg-[var(--surface-strong)] p-4 shadow-[var(--shadow)] transition",
        isOver && "ring-2 ring-[var(--accent-yellow)]",
        isDragging && "opacity-50"
      )}
      data-testid={`column-${column.id}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div
              className="h-2 w-10 cursor-grab rounded-full bg-[var(--accent-yellow)] active:cursor-grabbing"
              title="Drag to reorder column"
              {...attributes}
              {...listeners}
            />
            <span
              className={badgeClass}
              aria-label={`${cards.length} card${cards.length === 1 ? "" : "s"}`}
            >
              {cards.length}
            </span>
            {wipLimit !== null && (
              <span className="text-xs text-[var(--gray-text)]">/ {wipLimit}</span>
            )}
            {editingWipLimit ? (
              <input
                type="number"
                min={1}
                value={wipDraft}
                onChange={(e) => setWipDraft(e.target.value)}
                onBlur={commitWipLimit}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitWipLimit();
                  if (e.key === "Escape") { setWipDraft(column.wipLimit != null ? String(column.wipLimit) : ""); setEditingWipLimit(false); }
                }}
                placeholder="limit"
                autoFocus
                aria-label="WIP limit"
                className="w-14 rounded border border-[var(--stroke)] px-1 py-0.5 text-xs text-[var(--navy-dark)] outline-none focus:border-[var(--primary-blue)]"
              />
            ) : (
              <button
                type="button"
                onClick={() => { setWipDraft(column.wipLimit != null ? String(column.wipLimit) : ""); setEditingWipLimit(true); }}
                aria-label={wipLimit !== null ? `Edit WIP limit (currently ${wipLimit})` : "Set WIP limit"}
                className="rounded px-1 py-0.5 text-[10px] text-[var(--gray-text)] hover:text-[var(--primary-blue)]"
              >
                {wipLimit !== null ? "Edit limit" : "Set limit"}
              </button>
            )}
          </div>
          <input
            value={titleValue}
            onChange={(e) => setTitleValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
            className="mt-3 w-full bg-transparent font-display text-lg font-semibold text-[var(--navy-dark)] outline-none"
            aria-label="Column title"
          />
        </div>
        <div className="flex flex-shrink-0 items-center gap-1 pt-1">
          <button
            type="button"
            onClick={() => onToggleCollapse(column.id)}
            aria-label={`Collapse column ${column.title}`}
            title="Collapse column"
            className="rounded-lg border border-transparent p-1 text-[var(--gray-text)] transition hover:border-[var(--stroke)] hover:text-[var(--navy-dark)]"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 7h8M3 4h8M3 10h5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
          </button>
          {confirmDelete ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onDeleteColumn(column.id)}
                className="rounded-lg bg-red-500 px-2 py-1 text-[10px] font-bold text-white hover:bg-red-600"
                aria-label="Confirm delete column"
              >
                Delete
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="rounded-lg border border-[var(--stroke)] px-2 py-1 text-[10px] font-semibold text-[var(--gray-text)] hover:text-[var(--navy-dark)]"
              >
                No
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              aria-label={`Delete column ${column.title}`}
              className="rounded-lg border border-transparent p-1 text-[var(--gray-text)] transition hover:border-[var(--stroke)] hover:text-red-500"
              title="Delete column"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 4h10M5 4V2.5h4V4M5.5 6.5v4M8.5 6.5v4M3 4l.7 7.5h6.6L11 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      {confirmDelete && (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
          {cards.length > 0
            ? `This will delete the column and its ${cards.length} card${cards.length === 1 ? "" : "s"}.`
            : "Delete this empty column?"}
        </div>
      )}

      <div className="mt-4 flex flex-1 flex-col gap-3">
        <SortableContext items={column.cardIds} strategy={verticalListSortingStrategy}>
          {visibleCards.map((card) => (
            <KanbanCard
              key={card.id}
              card={card}
              otherColumns={otherColumns}
              searchQuery={filter?.search}
              onArchive={(cardId) => onArchiveCard(column.id, cardId)}
              onDuplicate={(cardId) => onDuplicateCard(column.id, cardId)}
              onMoveToColumn={(cardId, targetId) => onMoveCardToColumn(cardId, column.id, targetId)}
              onEdit={onEditCard}
            />
          ))}
        </SortableContext>
        {cards.length === 0 && !confirmDelete && (
          <div className="flex flex-1 flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-[var(--stroke)] px-4 py-8 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--gray-text)]">
              No cards yet
            </p>
            <p className="text-xs text-[var(--gray-text)]">Add one using the form below.</p>
          </div>
        )}
        {cards.length > 0 && visibleCards.length === 0 && (
          <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-[var(--stroke)] px-3 py-6 text-center text-xs font-semibold uppercase tracking-[0.2em] text-[var(--gray-text)]">
            No cards match filter
          </div>
        )}
      </div>
      <NewCardForm
        onAdd={(title, details) => onAddCard(column.id, title, details)}
        disabled={isDisabledByWip}
      />
    </section>
  );
};
