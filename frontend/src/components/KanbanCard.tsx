import { useEffect, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import clsx from "clsx";
import type { Card } from "@/lib/kanban";

type KanbanCardProps = {
  card: Card;
  onDelete: (cardId: string) => void;
  onEdit: (cardId: string, title: string, details: string) => void;
};

export const KanbanCard = ({ card, onDelete, onEdit }: KanbanCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(card.title);
  const [editDetails, setEditDetails] = useState(card.details);
  const [titleError, setTitleError] = useState(false);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  useEffect(() => {
    if (!isEditing) {
      setEditTitle(card.title);
      setEditDetails(card.details);
    }
  }, [card.title, card.details, isEditing]);

  const handleSave = () => {
    const trimmed = editTitle.trim();
    if (!trimmed) {
      setTitleError(true);
      return;
    }
    onEdit(card.id, trimmed, editDetails);
    setTitleError(false);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditTitle(card.title);
    setEditDetails(card.details);
    setTitleError(false);
    setIsEditing(false);
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={clsx(
        "rounded-2xl border border-transparent bg-white px-4 py-4 shadow-[0_12px_24px_rgba(3,33,71,0.08)]",
        "transition-all duration-150",
        isDragging && "opacity-60 shadow-[0_18px_32px_rgba(3,33,71,0.16)]"
      )}
      {...attributes}
      {...(isEditing ? {} : listeners)}
      data-testid={`card-${card.id}`}
    >
      {isEditing ? (
        <div className="flex flex-col gap-3">
          <input
            value={editTitle}
            onChange={(e) => { setEditTitle(e.target.value); setTitleError(false); }}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") handleCancel();
            }}
            className="w-full border-b border-[var(--stroke)] bg-transparent pb-1 font-display text-base font-semibold text-[var(--navy-dark)] outline-none"
            aria-label="Card title"
            autoFocus
          />
          {titleError && (
            <p role="alert" className="text-xs text-red-600">Title is required.</p>
          )}
          <textarea
            value={editDetails}
            onChange={(e) => setEditDetails(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") handleCancel();
            }}
            className="w-full resize-none bg-transparent text-sm leading-6 text-[var(--gray-text)] outline-none"
            rows={3}
            aria-label="Card details"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              className="rounded-lg bg-[var(--primary-blue)] px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90"
            >
              Save
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-lg border border-[var(--stroke)] px-3 py-1.5 text-xs font-semibold text-[var(--gray-text)] transition hover:border-[var(--navy-dark)]"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-start justify-between gap-3">
          <div>
            <h4 className="font-display text-base font-semibold text-[var(--navy-dark)]">
              {card.title}
            </h4>
            <p className="mt-2 text-sm leading-6 text-[var(--gray-text)]">
              {card.details}
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="rounded-full border border-transparent px-2 py-1 text-xs font-semibold text-[var(--gray-text)] transition hover:border-[var(--stroke)] hover:text-[var(--navy-dark)]"
              aria-label={`Edit ${card.title}`}
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => onDelete(card.id)}
              className="rounded-full border border-transparent px-2 py-1 text-xs font-semibold text-[var(--gray-text)] transition hover:border-[var(--stroke)] hover:text-[var(--navy-dark)]"
              aria-label={`Delete ${card.title}`}
            >
              Remove
            </button>
          </div>
        </div>
      )}
    </article>
  );
};
