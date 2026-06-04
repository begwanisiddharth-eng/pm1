import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  matchesFilter,
  moveCard,
  moveColumn,
  timeAgo,
  createId,
  type Card,
  type Column,
  type CardFilter,
} from "./kanban";

// ── matchesFilter ────────────────────────────────────────────────────────

const baseCard: Card = {
  id: "c1",
  title: "Fix the login bug",
  details: "Reproducible on Safari",
  priority: "high",
  due_date: "2020-01-01",
};

const emptyFilter: CardFilter = { search: "", priority: null, overdueOnly: false };

describe("matchesFilter", () => {
  it("passes with empty filter", () => {
    expect(matchesFilter(baseCard, emptyFilter)).toBe(true);
  });

  describe("search", () => {
    it("matches title case-insensitively", () => {
      expect(matchesFilter(baseCard, { ...emptyFilter, search: "login" })).toBe(true);
      expect(matchesFilter(baseCard, { ...emptyFilter, search: "LOGIN" })).toBe(true);
    });

    it("matches details", () => {
      expect(matchesFilter(baseCard, { ...emptyFilter, search: "safari" })).toBe(true);
    });

    it("fails when neither title nor details match", () => {
      expect(matchesFilter(baseCard, { ...emptyFilter, search: "xyz" })).toBe(false);
    });
  });

  describe("priority", () => {
    it("passes when priority matches", () => {
      expect(matchesFilter(baseCard, { ...emptyFilter, priority: "high" })).toBe(true);
    });

    it("fails when priority does not match", () => {
      expect(matchesFilter(baseCard, { ...emptyFilter, priority: "low" })).toBe(false);
    });

    it("fails when filter has priority and card priority is null", () => {
      const noP: Card = { ...baseCard, priority: null };
      expect(matchesFilter(noP, { ...emptyFilter, priority: "medium" })).toBe(false);
    });
  });

  describe("overdueOnly", () => {
    it("passes for a past due date", () => {
      expect(matchesFilter(baseCard, { ...emptyFilter, overdueOnly: true })).toBe(true);
    });

    it("fails for a future due date", () => {
      const future: Card = { ...baseCard, due_date: "2099-12-31" };
      expect(matchesFilter(future, { ...emptyFilter, overdueOnly: true })).toBe(false);
    });

    it("fails when card has no due date", () => {
      const noDue: Card = { ...baseCard, due_date: null };
      expect(matchesFilter(noDue, { ...emptyFilter, overdueOnly: true })).toBe(false);
    });
  });

  it("all three conditions must pass simultaneously", () => {
    const filter: CardFilter = { search: "login", priority: "high", overdueOnly: true };
    expect(matchesFilter(baseCard, filter)).toBe(true);
    expect(matchesFilter(baseCard, { ...filter, search: "xyz" })).toBe(false);
    expect(matchesFilter(baseCard, { ...filter, priority: "low" })).toBe(false);
  });
});

// ── moveCard ──────────────────────────────────────────────────────────────

const makeColumns = (): Column[] => [
  { id: "col-a", title: "A", cardIds: ["c1", "c2", "c3"] },
  { id: "col-b", title: "B", cardIds: ["c4", "c5"] },
];

describe("moveCard", () => {
  it("reorders within the same column", () => {
    const result = moveCard(makeColumns(), "c1", "c3");
    expect(result.find((c) => c.id === "col-a")!.cardIds).toEqual(["c2", "c3", "c1"]);
  });

  it("moves card to end when dropped on its own column header", () => {
    const result = moveCard(makeColumns(), "c2", "col-a");
    const ids = result.find((c) => c.id === "col-a")!.cardIds;
    expect(ids[ids.length - 1]).toBe("c2");
  });

  it("moves card to another column when dropped on a card", () => {
    const result = moveCard(makeColumns(), "c1", "c4");
    expect(result.find((c) => c.id === "col-a")!.cardIds).not.toContain("c1");
    expect(result.find((c) => c.id === "col-b")!.cardIds).toContain("c1");
  });

  it("moves card to another column when dropped on the column header", () => {
    const result = moveCard(makeColumns(), "c1", "col-b");
    const bIds = result.find((c) => c.id === "col-b")!.cardIds;
    expect(bIds[bIds.length - 1]).toBe("c1");
    expect(result.find((c) => c.id === "col-a")!.cardIds).not.toContain("c1");
  });

  it("returns original columns reference when activeId not found", () => {
    const cols = makeColumns();
    expect(moveCard(cols, "ghost", "c2")).toBe(cols);
  });

  it("does not mutate original columns", () => {
    const cols = makeColumns();
    const before = [...cols[0].cardIds];
    moveCard(cols, "c1", "c4");
    expect(cols[0].cardIds).toEqual(before);
  });
});

// ── moveColumn ────────────────────────────────────────────────────────────

const makeCols = (): Column[] => [
  { id: "col-1", title: "One", cardIds: [] },
  { id: "col-2", title: "Two", cardIds: [] },
  { id: "col-3", title: "Three", cardIds: [] },
];

describe("moveColumn", () => {
  it("moves first column to last position", () => {
    expect(moveColumn(makeCols(), "col-1", "col-3").map((c) => c.id)).toEqual([
      "col-2",
      "col-3",
      "col-1",
    ]);
  });

  it("moves last column to first position", () => {
    expect(moveColumn(makeCols(), "col-3", "col-1").map((c) => c.id)).toEqual([
      "col-3",
      "col-1",
      "col-2",
    ]);
  });

  it("returns original array reference when activeId === overId", () => {
    const cols = makeCols();
    expect(moveColumn(cols, "col-1", "col-1")).toBe(cols);
  });

  it("returns original array reference when id not found", () => {
    const cols = makeCols();
    expect(moveColumn(cols, "ghost", "col-1")).toBe(cols);
  });

  it("does not mutate original array", () => {
    const cols = makeCols();
    const ids = cols.map((c) => c.id);
    moveColumn(cols, "col-1", "col-3");
    expect(cols.map((c) => c.id)).toEqual(ids);
  });
});

// ── timeAgo ───────────────────────────────────────────────────────────────

describe("timeAgo", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-04T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "just now" for < 60 seconds ago', () => {
    expect(timeAgo(new Date(Date.now() - 30_000).toISOString())).toBe("just now");
  });

  it('returns "1 minute ago" for exactly 60 seconds ago', () => {
    expect(timeAgo(new Date(Date.now() - 60_000).toISOString())).toBe("1 minute ago");
  });

  it('returns plural "N minutes ago"', () => {
    expect(timeAgo(new Date(Date.now() - 5 * 60_000).toISOString())).toBe("5 minutes ago");
  });

  it('returns "1 hour ago" for exactly 60 minutes ago', () => {
    expect(timeAgo(new Date(Date.now() - 60 * 60_000).toISOString())).toBe("1 hour ago");
  });

  it('returns plural "N hours ago"', () => {
    expect(timeAgo(new Date(Date.now() - 3 * 60 * 60_000).toISOString())).toBe("3 hours ago");
  });

  it('returns "1 day ago" for exactly 24 hours ago', () => {
    expect(timeAgo(new Date(Date.now() - 24 * 60 * 60_000).toISOString())).toBe("1 day ago");
  });

  it('returns plural "N days ago"', () => {
    expect(timeAgo(new Date(Date.now() - 7 * 24 * 60 * 60_000).toISOString())).toBe("7 days ago");
  });
});

// ── createId ──────────────────────────────────────────────────────────────

describe("createId", () => {
  it("starts with the given prefix", () => {
    expect(createId("card")).toMatch(/^card-/);
    expect(createId("col")).toMatch(/^col-/);
  });

  it("produces unique IDs on 100 successive calls", () => {
    const ids = Array.from({ length: 100 }, () => createId("x"));
    expect(new Set(ids).size).toBe(100);
  });
});
