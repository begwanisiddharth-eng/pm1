import { moveCard, moveColumn, matchesFilter, timeAgo, type Column, type Card, type CardFilter } from "@/lib/kanban";

describe("moveColumn", () => {
  const cols: Column[] = [
    { id: "col-a", title: "A", cardIds: [] },
    { id: "col-b", title: "B", cardIds: [] },
    { id: "col-c", title: "C", cardIds: [] },
  ];

  it("moves a column forward", () => {
    const result = moveColumn(cols, "col-a", "col-b");
    expect(result.map((c) => c.id)).toEqual(["col-b", "col-a", "col-c"]);
  });

  it("moves a column backward", () => {
    const result = moveColumn(cols, "col-c", "col-a");
    expect(result.map((c) => c.id)).toEqual(["col-c", "col-a", "col-b"]);
  });

  it("returns same array when moving to same position", () => {
    const result = moveColumn(cols, "col-b", "col-b");
    expect(result).toBe(cols);
  });

  it("returns same array when id not found", () => {
    const result = moveColumn(cols, "col-x", "col-a");
    expect(result).toBe(cols);
  });
});

describe("moveCard", () => {
  const baseColumns: Column[] = [
    { id: "col-a", title: "A", cardIds: ["card-1", "card-2"] },
    { id: "col-b", title: "B", cardIds: ["card-3"] },
  ];

  it("reorders cards in the same column", () => {
    const result = moveCard(baseColumns, "card-2", "card-1");
    expect(result[0].cardIds).toEqual(["card-2", "card-1"]);
  });

  it("moves cards to another column", () => {
    const result = moveCard(baseColumns, "card-2", "card-3");
    expect(result[0].cardIds).toEqual(["card-1"]);
    expect(result[1].cardIds).toEqual(["card-2", "card-3"]);
  });

  it("drops cards to the end of a column", () => {
    const result = moveCard(baseColumns, "card-1", "col-b");
    expect(result[0].cardIds).toEqual(["card-2"]);
    expect(result[1].cardIds).toEqual(["card-3", "card-1"]);
  });
});

describe("matchesFilter", () => {
  const baseCard: Card = {
    id: "c1",
    title: "Fix login bug",
    details: "Users cannot log in with SSO",
    priority: "high",
    due_date: "2020-01-01",
    labels: ["bug"],
  };

  const emptyFilter: CardFilter = { search: "", priority: null, overdueOnly: false };

  it("returns true when filter is empty", () => {
    expect(matchesFilter(baseCard, emptyFilter)).toBe(true);
  });

  it("matches by title substring (case insensitive)", () => {
    expect(matchesFilter(baseCard, { ...emptyFilter, search: "login" })).toBe(true);
    expect(matchesFilter(baseCard, { ...emptyFilter, search: "LOGIN" })).toBe(true);
    expect(matchesFilter(baseCard, { ...emptyFilter, search: "payment" })).toBe(false);
  });

  it("matches by details substring", () => {
    expect(matchesFilter(baseCard, { ...emptyFilter, search: "SSO" })).toBe(true);
  });

  it("filters by priority", () => {
    expect(matchesFilter(baseCard, { ...emptyFilter, priority: "high" })).toBe(true);
    expect(matchesFilter(baseCard, { ...emptyFilter, priority: "low" })).toBe(false);
  });

  it("overdue filter excludes cards without due_date", () => {
    const noDue: Card = { ...baseCard, due_date: null };
    expect(matchesFilter(noDue, { ...emptyFilter, overdueOnly: true })).toBe(false);
  });

  it("overdue filter includes cards with past due date", () => {
    expect(matchesFilter(baseCard, { ...emptyFilter, overdueOnly: true })).toBe(true);
  });

  it("overdue filter excludes cards with future due date", () => {
    const future: Card = { ...baseCard, due_date: "2099-12-31" };
    expect(matchesFilter(future, { ...emptyFilter, overdueOnly: true })).toBe(false);
  });

  it("combines search and priority filters", () => {
    expect(
      matchesFilter(baseCard, { search: "login", priority: "high", overdueOnly: false })
    ).toBe(true);
    expect(
      matchesFilter(baseCard, { search: "login", priority: "low", overdueOnly: false })
    ).toBe(false);
  });
});

describe("timeAgo", () => {
  const now = Date.now();

  it("returns 'just now' for less than 60 seconds ago", () => {
    expect(timeAgo(new Date(now - 30_000).toISOString())).toBe("just now");
  });

  it("returns minutes ago", () => {
    expect(timeAgo(new Date(now - 5 * 60_000).toISOString())).toBe("5 minutes ago");
  });

  it("returns '1 minute ago' (singular)", () => {
    expect(timeAgo(new Date(now - 90_000).toISOString())).toBe("1 minute ago");
  });

  it("returns hours ago", () => {
    expect(timeAgo(new Date(now - 3 * 3600_000).toISOString())).toBe("3 hours ago");
  });

  it("returns '1 hour ago' (singular)", () => {
    expect(timeAgo(new Date(now - 3700_000).toISOString())).toBe("1 hour ago");
  });

  it("returns days ago", () => {
    expect(timeAgo(new Date(now - 2 * 86_400_000).toISOString())).toBe("2 days ago");
  });

  it("returns '1 day ago' (singular)", () => {
    expect(timeAgo(new Date(now - 25 * 3600_000).toISOString())).toBe("1 day ago");
  });
});
