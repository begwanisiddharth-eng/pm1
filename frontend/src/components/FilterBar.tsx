import clsx from "clsx";
import type { CardFilter, Priority } from "@/lib/kanban";
import { PRIORITY_OPTIONS } from "@/lib/kanban";

type FilterBarProps = {
  filter: CardFilter;
  onChange: (filter: CardFilter) => void;
};

export const FilterBar = ({ filter, onChange }: FilterBarProps) => {
  const setSearch = (search: string) => onChange({ ...filter, search });
  const setPriority = (priority: Priority | null) => onChange({ ...filter, priority });
  const setOverdue = (overdueOnly: boolean) => onChange({ ...filter, overdueOnly });

  const isActive = filter.search || filter.priority || filter.overdueOnly;

  return (
    <div
      className="flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--stroke)] bg-white/80 px-4 py-3 shadow-[var(--shadow)] backdrop-blur"
      role="search"
      aria-label="Filter cards"
    >
      <input
        type="text"
        value={filter.search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search cards..."
        className="min-w-[160px] flex-1 rounded-xl border border-[var(--stroke)] bg-[var(--surface)] px-3 py-1.5 text-sm text-[var(--navy-dark)] outline-none placeholder:text-[var(--gray-text)] focus:border-[var(--primary-blue)]"
        aria-label="Search cards"
      />

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--gray-text)]">
          Priority:
        </span>
        <button
          type="button"
          onClick={() => setPriority(null)}
          className={clsx(
            "rounded-full border px-2.5 py-0.5 text-xs font-semibold transition",
            filter.priority === null
              ? "border-[var(--navy-dark)] bg-[var(--navy-dark)] text-white"
              : "border-[var(--stroke)] text-[var(--gray-text)] hover:border-[var(--navy-dark)]"
          )}
        >
          All
        </button>
        {PRIORITY_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setPriority(filter.priority === opt.value ? null : opt.value)}
            className={clsx(
              "rounded-full border px-2.5 py-0.5 text-xs font-semibold transition",
              filter.priority === opt.value
                ? opt.color + " border-current"
                : "border-[var(--stroke)] text-[var(--gray-text)] hover:border-current"
            )}
            aria-pressed={filter.priority === opt.value}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setOverdue(!filter.overdueOnly)}
        className={clsx(
          "rounded-full border px-2.5 py-0.5 text-xs font-semibold transition",
          filter.overdueOnly
            ? "border-red-400 bg-red-100 text-red-700"
            : "border-[var(--stroke)] text-[var(--gray-text)] hover:border-red-400 hover:text-red-600"
        )}
        aria-pressed={filter.overdueOnly}
      >
        Overdue only
      </button>

      {isActive && (
        <button
          type="button"
          onClick={() => onChange({ search: "", priority: null, overdueOnly: false })}
          className="text-xs font-semibold text-[var(--gray-text)] hover:text-[var(--navy-dark)]"
        >
          Clear filters
        </button>
      )}
    </div>
  );
};
