import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import clsx from "clsx";
import type { Card, Priority } from "@/lib/kanban";
import { LABEL_OPTIONS } from "@/lib/kanban";

type KanbanCardProps = {
  card: Card;
  onDelete: (cardId: string) => void;
  onEdit: (
    cardId: string,
    title: string,
    details: string,
    priority: Priority | null,
    dueDate: string | null,
    labels: string[],
  ) => void;
};

const PRIORITY_OPTIONS: { value: Priority; label: string; color: string }[] = [
  { value: "low",      label: "Low",      color: "bg-green-100 text-green-700 border-green-300" },
  { value: "medium",   label: "Medium",   color: "bg-yellow-100 text-yellow-700 border-yellow-300" },
  { value: "high",     label: "High",     color: "bg-orange-100 text-orange-700 border-orange-300" },
  { value: "critical", label: "Critical", color: "bg-red-100 text-red-700 border-red-300" },
];

const priorityStyle = (p: Priority): string => {
  switch (p) {
    case "low":      return "bg-green-100 text-green-700";
    case "medium":   return "bg-yellow-100 text-yellow-700";
    case "high":     return "bg-orange-100 text-orange-700";
    case "critical": return "bg-red-100 text-red-700";
  }
};

const formatDueDate = (dateStr: string): { text: string; overdue: boolean; soon: boolean } => {
  const due = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  const diffDays = Math.round((due.getTime() - today.getTime()) / 86_400_000);
  const text = due.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return { text, overdue: diffDays < 0, soon: diffDays >= 0 && diffDays <= 2 };
};

export const KanbanCard = ({ card, onDelete, onEdit }: KanbanCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDetails, setEditDetails] = useState("");
  const [editPriority, setEditPriority] = useState<Priority | null>(null);
  const [editDueDate, setEditDueDate] = useState("");
  const [editLabels, setEditLabels] = useState<string[]>([]);
  const [titleError, setTitleError] = useState(false);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const openEdit = () => {
    setEditTitle(card.title);
    setEditDetails(card.details);
    setEditPriority(card.priority ?? null);
    setEditDueDate(card.due_date ?? "");
    setEditLabels(card.labels ?? []);
    setTitleError(false);
    setIsEditing(true);
  };

  const toggleLabel = (labelId: string) => {
    setEditLabels((prev) =>
      prev.includes(labelId) ? prev.filter((l) => l !== labelId) : [...prev, labelId]
    );
  };

  const handleSave = () => {
    const trimmed = editTitle.trim();
    if (!trimmed) {
      setTitleError(true);
      return;
    }
    onEdit(card.id, trimmed, editDetails, editPriority, editDueDate || null, editLabels);
    setTitleError(false);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setTitleError(false);
    setIsEditing(false);
  };

  const dueDateInfo = card.due_date ? formatDueDate(card.due_date) : null;

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

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--gray-text)]">
              Priority
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setEditPriority(null)}
                className={clsx(
                  "rounded-full border px-2.5 py-0.5 text-xs font-semibold transition",
                  editPriority === null
                    ? "border-[var(--navy-dark)] bg-[var(--navy-dark)] text-white"
                    : "border-[var(--stroke)] text-[var(--gray-text)] hover:border-[var(--navy-dark)]"
                )}
              >
                None
              </button>
              {PRIORITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setEditPriority(opt.value)}
                  className={clsx(
                    "rounded-full border px-2.5 py-0.5 text-xs font-semibold transition",
                    editPriority === opt.value
                      ? opt.color + " border-current"
                      : "border-[var(--stroke)] text-[var(--gray-text)] hover:border-current"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor={`due-${card.id}`}
              className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--gray-text)]"
            >
              Due date
            </label>
            <input
              id={`due-${card.id}`}
              type="date"
              value={editDueDate}
              onChange={(e) => setEditDueDate(e.target.value)}
              className="rounded-lg border border-[var(--stroke)] bg-[var(--surface)] px-2.5 py-1.5 text-xs text-[var(--navy-dark)] outline-none focus:border-[var(--primary-blue)]"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--gray-text)]">
              Labels
            </span>
            <div className="flex flex-wrap gap-1.5">
              {LABEL_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => toggleLabel(opt.id)}
                  className={clsx(
                    "rounded-full border px-2.5 py-0.5 text-xs font-semibold transition",
                    editLabels.includes(opt.id)
                      ? opt.color + " border-current"
                      : "border-[var(--stroke)] text-[var(--gray-text)] hover:border-current"
                  )}
                  aria-pressed={editLabels.includes(opt.id)}
                >
                  {opt.text}
                </button>
              ))}
            </div>
          </div>

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
          <div className="min-w-0 flex-1">
            <h4 className="font-display text-base font-semibold text-[var(--navy-dark)]">
              {card.title}
            </h4>
            <p className="mt-2 text-sm leading-6 text-[var(--gray-text)]">
              {card.details}
            </p>
            {(card.priority || dueDateInfo || (card.labels && card.labels.length > 0)) && (
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {card.priority && (
                  <span
                    className={clsx(
                      "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                      priorityStyle(card.priority)
                    )}
                  >
                    {card.priority}
                  </span>
                )}
                {dueDateInfo && (
                  <span
                    className={clsx(
                      "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                      dueDateInfo.overdue
                        ? "bg-red-100 text-red-700"
                        : dueDateInfo.soon
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-[var(--surface)] text-[var(--gray-text)]"
                    )}
                  >
                    {dueDateInfo.overdue && "Overdue · "}
                    {dueDateInfo.text}
                  </span>
                )}
                {card.labels?.map((labelId) => {
                  const opt = LABEL_OPTIONS.find((l) => l.id === labelId);
                  if (!opt) return null;
                  return (
                    <span
                      key={labelId}
                      className={clsx(
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                        opt.color
                      )}
                    >
                      {opt.text}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={openEdit}
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
