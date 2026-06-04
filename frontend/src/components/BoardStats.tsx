import type { BoardData } from "@/lib/kanban";

type BoardStatsProps = {
  board: BoardData;
};

export const BoardStats = ({ board }: BoardStatsProps) => {
  const archivedIds = new Set(board.archivedCardIds ?? []);
  const cards = Object.values(board.cards).filter((c) => !archivedIds.has(c.id));
  const total = cards.length;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const overdue = cards.filter((card) => {
    if (!card.due_date) return false;
    const due = new Date(card.due_date);
    due.setHours(0, 0, 0, 0);
    return due < today;
  }).length;

  const allItems = cards.flatMap((card) => card.checklist ?? []);
  const totalItems = allItems.length;
  const doneItems = allItems.filter((item) => item.done).length;

  if (total === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-4 text-xs">
      <div className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-[var(--primary-blue)]" />
        <span className="font-semibold text-[var(--navy-dark)]">{total}</span>
        <span className="text-[var(--gray-text)]">cards</span>
      </div>
      {overdue > 0 && (
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-red-400" />
          <span className="font-semibold text-red-600">{overdue}</span>
          <span className="text-[var(--gray-text)]">overdue</span>
        </div>
      )}
      {totalItems > 0 && (
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[var(--accent-yellow)]" />
          <span className="font-semibold text-[var(--navy-dark)]">
            {doneItems} / {totalItems}
          </span>
          <span className="text-[var(--gray-text)]">checklist</span>
        </div>
      )}
    </div>
  );
};
