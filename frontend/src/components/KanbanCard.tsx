import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import clsx from "clsx";
import type { Card, ChecklistItem, Comment, Priority } from "@/lib/kanban";
import { CARD_COLORS, LABEL_OPTIONS, createId } from "@/lib/kanban";

type ColumnOption = { id: string; title: string };

const HighlightText = ({ text, query }: { text: string; query: string }) => {
  if (!query) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-200 text-[var(--navy-dark)]">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
};

type KanbanCardProps = {
  card: Card;
  otherColumns: ColumnOption[];
  searchQuery?: string;
  onArchive: (cardId: string) => void;
  onDuplicate: (cardId: string) => void;
  onMoveToColumn: (cardId: string, targetColumnId: string) => void;
  onEdit: (
    cardId: string,
    title: string,
    details: string,
    priority: Priority | null,
    dueDate: string | null,
    labels: string[],
    checklist: ChecklistItem[],
    comments: Comment[],
    color: string | null,
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

export const KanbanCard = ({ card, otherColumns, searchQuery = "", onArchive, onDuplicate, onMoveToColumn, onEdit }: KanbanCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDetails, setEditDetails] = useState("");
  const [editPriority, setEditPriority] = useState<Priority | null>(null);
  const [editDueDate, setEditDueDate] = useState("");
  const [editLabels, setEditLabels] = useState<string[]>([]);
  const [editChecklist, setEditChecklist] = useState<ChecklistItem[]>([]);
  const [editComments, setEditComments] = useState<Comment[]>([]);
  const [newCommentText, setNewCommentText] = useState("");
  const [editColor, setEditColor] = useState<string | null>(null);
  const [newChecklistText, setNewChecklistText] = useState("");
  const [titleError, setTitleError] = useState(false);
  const [showMoveMenu, setShowMoveMenu] = useState(false);

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
    setEditChecklist(card.checklist ?? []);
    setEditComments(card.comments ?? []);
    setEditColor(card.color ?? null);
    setNewChecklistText("");
    setNewCommentText("");
    setTitleError(false);
    setIsEditing(true);
  };

  const toggleLabel = (labelId: string) => {
    setEditLabels((prev) =>
      prev.includes(labelId) ? prev.filter((l) => l !== labelId) : [...prev, labelId]
    );
  };

  const addChecklistItem = () => {
    const text = newChecklistText.trim();
    if (!text) return;
    setEditChecklist((prev) => [...prev, { id: createId("chk"), text, done: false }]);
    setNewChecklistText("");
  };

  const toggleChecklistItem = (itemId: string) => {
    setEditChecklist((prev) =>
      prev.map((item) => item.id === itemId ? { ...item, done: !item.done } : item)
    );
  };

  const removeChecklistItem = (itemId: string) => {
    setEditChecklist((prev) => prev.filter((item) => item.id !== itemId));
  };

  const addComment = () => {
    const text = newCommentText.trim();
    if (!text) return;
    setEditComments((prev) => [
      ...prev,
      { id: createId("cmt"), text, created_at: new Date().toISOString() },
    ]);
    setNewCommentText("");
  };

  const handleSave = () => {
    const trimmed = editTitle.trim();
    if (!trimmed) {
      setTitleError(true);
      return;
    }
    onEdit(card.id, trimmed, editDetails, editPriority, editDueDate || null, editLabels, editChecklist, editComments, editColor);
    setTitleError(false);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setTitleError(false);
    setIsEditing(false);
  };

  const dueDateInfo = card.due_date ? formatDueDate(card.due_date) : null;
  const checklist = card.checklist ?? [];
  const checklistDone = checklist.filter((i) => i.done).length;
  const commentCount = (card.comments ?? []).length;
  const shadowClass = isDragging
    ? "shadow-[0_18px_32px_rgba(3,33,71,0.16)]"
    : dueDateInfo?.overdue
      ? "shadow-[0_12px_24px_rgba(3,33,71,0.08),inset_3px_0_0_#f87171]"
      : "shadow-[0_12px_24px_rgba(3,33,71,0.08)]";

  return (
    <article
      ref={setNodeRef}
      style={{ ...style, borderTop: card.color ? `3px solid ${card.color}` : undefined }}
      className={clsx(
        "rounded-2xl border border-transparent bg-white px-4 py-4",
        "transition-all duration-150",
        shadowClass,
        isDragging && "opacity-60"
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

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--gray-text)]">
              Checklist
            </span>
            <div className="flex flex-col gap-1">
              {editChecklist.map((item) => (
                <div key={item.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={item.done}
                    onChange={() => toggleChecklistItem(item.id)}
                    className="h-3.5 w-3.5 accent-[var(--primary-blue)]"
                    aria-label={`Toggle ${item.text}`}
                  />
                  <span
                    className={clsx(
                      "flex-1 text-xs text-[var(--navy-dark)]",
                      item.done && "line-through text-[var(--gray-text)]"
                    )}
                  >
                    {item.text}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeChecklistItem(item.id)}
                    className="text-[10px] text-[var(--gray-text)] hover:text-red-500"
                    aria-label={`Remove ${item.text}`}
                  >
                    Remove
                  </button>
                </div>
              ))}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  value={newChecklistText}
                  onChange={(e) => setNewChecklistText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); addChecklistItem(); }
                  }}
                  placeholder="Add item..."
                  className="flex-1 rounded border border-[var(--stroke)] bg-[var(--surface)] px-2 py-1 text-xs text-[var(--navy-dark)] outline-none placeholder:text-[var(--gray-text)] focus:border-[var(--primary-blue)]"
                  aria-label="New checklist item"
                />
                <button
                  type="button"
                  onClick={addChecklistItem}
                  className="rounded border border-[var(--stroke)] px-2 py-1 text-[10px] font-semibold text-[var(--gray-text)] hover:border-[var(--navy-dark)] hover:text-[var(--navy-dark)]"
                >
                  Add
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--gray-text)]">
              Color
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setEditColor(null)}
                className={clsx(
                  "h-5 w-5 rounded-full border-2 bg-[var(--surface)] transition",
                  editColor === null ? "border-[var(--navy-dark)]" : "border-[var(--stroke)]"
                )}
                aria-label="No color"
                title="None"
              />
              {CARD_COLORS.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setEditColor(c.hex)}
                  style={{ backgroundColor: c.hex }}
                  className={clsx(
                    "h-5 w-5 rounded-full border-2 transition",
                    editColor === c.hex ? "border-[var(--navy-dark)]" : "border-transparent"
                  )}
                  aria-label={c.label}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--gray-text)]">
              Comments
            </span>
            <div className="flex flex-col gap-1.5">
              {editComments.map((cmt) => (
                <div key={cmt.id} className="rounded-lg bg-[var(--surface)] px-3 py-2">
                  <p className="text-xs text-[var(--navy-dark)]">{cmt.text}</p>
                  <p className="mt-0.5 text-[10px] text-[var(--gray-text)]">
                    {new Date(cmt.created_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              ))}
              <div className="flex items-start gap-2">
                <textarea
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addComment(); }
                  }}
                  placeholder="Add a comment..."
                  rows={2}
                  className="flex-1 resize-none rounded border border-[var(--stroke)] bg-[var(--surface)] px-2 py-1 text-xs text-[var(--navy-dark)] outline-none placeholder:text-[var(--gray-text)] focus:border-[var(--primary-blue)]"
                  aria-label="New comment"
                />
                <button
                  type="button"
                  onClick={addComment}
                  aria-label="Add comment"
                  className="rounded border border-[var(--stroke)] px-2 py-1 text-[10px] font-semibold text-[var(--gray-text)] hover:border-[var(--navy-dark)] hover:text-[var(--navy-dark)]"
                >
                  Add
                </button>
              </div>
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
              <HighlightText text={card.title} query={searchQuery} />
            </h4>
            <p className="mt-2 text-sm leading-6 text-[var(--gray-text)]">
              <HighlightText text={card.details} query={searchQuery} />
            </p>
            {(card.priority || dueDateInfo || (card.labels && card.labels.length > 0) || checklist.length > 0) && (
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
                {checklist.length > 0 && (
                  <span
                    className={clsx(
                      "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                      checklistDone === checklist.length
                        ? "bg-green-100 text-green-700"
                        : "bg-[var(--surface)] text-[var(--gray-text)]"
                    )}
                  >
                    {checklistDone} / {checklist.length}
                  </span>
                )}
                {commentCount > 0 && (
                  <span className="rounded-full bg-[var(--surface)] px-2 py-0.5 text-[10px] font-semibold text-[var(--gray-text)]">
                    {commentCount} comment{commentCount === 1 ? "" : "s"}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="relative flex flex-col gap-1">
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
              onClick={() => onDuplicate(card.id)}
              className="rounded-full border border-transparent px-2 py-1 text-xs font-semibold text-[var(--gray-text)] transition hover:border-[var(--stroke)] hover:text-[var(--navy-dark)]"
              aria-label={`Duplicate ${card.title}`}
            >
              Copy
            </button>
            {otherColumns.length > 0 && (
              <button
                type="button"
                onClick={() => setShowMoveMenu((v) => !v)}
                className="rounded-full border border-transparent px-2 py-1 text-xs font-semibold text-[var(--gray-text)] transition hover:border-[var(--stroke)] hover:text-[var(--navy-dark)]"
                aria-label={`Move ${card.title}`}
              >
                Move
              </button>
            )}
            {showMoveMenu && (
              <div className="absolute right-0 top-full z-10 mt-1 min-w-[120px] rounded-xl border border-[var(--stroke)] bg-white shadow-lg">
                {otherColumns.map((col) => (
                  <button
                    key={col.id}
                    type="button"
                    onClick={() => { onMoveToColumn(card.id, col.id); setShowMoveMenu(false); }}
                    className="block w-full px-3 py-1.5 text-left text-xs text-[var(--navy-dark)] hover:bg-[var(--surface)]"
                  >
                    {col.title}
                  </button>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() => onArchive(card.id)}
              className="rounded-full border border-transparent px-2 py-1 text-xs font-semibold text-[var(--gray-text)] transition hover:border-[var(--stroke)] hover:text-[var(--navy-dark)]"
              aria-label={`Archive ${card.title}`}
            >
              Archive
            </button>
          </div>
        </div>
      )}
    </article>
  );
};
