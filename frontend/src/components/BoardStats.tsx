import type { BoardData } from "@/lib/kanban";
import { isOverdue } from "@/lib/kanban";

type BoardStatsProps = {
  board: BoardData;
};

export const BoardStats = ({ board }: BoardStatsProps) => {
  const archivedIds = new Set(board.archivedCardIds ?? []);
  const cards = Object.values(board.cards).filter((c) => !archivedIds.has(c.id));
  const total = cards.length;

  let overdue = 0, totalItems = 0, doneItems = 0;
  for (const card of cards) {
    if (isOverdue(card)) overdue++;
    for (const item of card.checklist ?? []) {
      totalItems++;
      if (item.done) doneItems++;
    }
  }

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
