import { moveCard, matchesFilter, type Column, type Card, type CardFilter } from "@/lib/kanban";

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
