import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { BoardStats } from "./BoardStats";
import type { BoardData } from "@/lib/kanban";

const today = new Date();
today.setHours(0, 0, 0, 0);

const pastDate = new Date(today.getTime() - 2 * 86_400_000).toISOString().slice(0, 10);
const futureDate = new Date(today.getTime() + 5 * 86_400_000).toISOString().slice(0, 10);

function makeBoard(overrides: Partial<BoardData> = {}): BoardData {
  return {
    columns: [{ id: "col-1", title: "Work", cardIds: ["c1"] }],
    cards: {
      c1: { id: "c1", title: "Card One", details: "" },
    },
    archivedCardIds: [],
    ...overrides,
  };
}

describe("BoardStats", () => {
  it("renders nothing when there are no cards", () => {
    const board = makeBoard({ columns: [], cards: {} });
    const { container } = render(<BoardStats board={board} />);
    expect(container.firstChild).toBeNull();
  });

  it("shows total active card count", () => {
    const board = makeBoard({
      columns: [{ id: "col-1", title: "Work", cardIds: ["c1", "c2"] }],
      cards: {
        c1: { id: "c1", title: "A", details: "" },
        c2: { id: "c2", title: "B", details: "" },
      },
    });
    render(<BoardStats board={board} />);
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("cards")).toBeInTheDocument();
  });

  it("excludes archived cards from total", () => {
    const board = makeBoard({
      columns: [{ id: "col-1", title: "Work", cardIds: ["c1"] }],
      cards: {
        c1: { id: "c1", title: "Active", details: "" },
        c2: { id: "c2", title: "Archived", details: "", archived: true },
      },
      archivedCardIds: ["c2"],
    });
    render(<BoardStats board={board} />);
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.queryByText("2")).not.toBeInTheDocument();
  });

  it("shows overdue count when there are overdue active cards", () => {
    const board = makeBoard({
      columns: [{ id: "col-1", title: "Work", cardIds: ["c1", "c2"] }],
      cards: {
        c1: { id: "c1", title: "Overdue card", details: "", due_date: pastDate },
        c2: { id: "c2", title: "Fine card", details: "" },
      },
    });
    render(<BoardStats board={board} />);
    expect(screen.getByText("overdue")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument(); // total
    expect(screen.getByText("1")).toBeInTheDocument(); // overdue — unique since total is 2
  });

  it("does not count archived cards as overdue", () => {
    const board = makeBoard({
      columns: [{ id: "col-1", title: "Work", cardIds: ["c1"] }],
      cards: {
        c1: { id: "c1", title: "Active", details: "" },
        c2: { id: "c2", title: "Archived overdue", details: "", due_date: pastDate, archived: true },
      },
      archivedCardIds: ["c2"],
    });
    render(<BoardStats board={board} />);
    expect(screen.queryByText("overdue")).not.toBeInTheDocument();
  });

  it("does not show overdue section when no cards are overdue", () => {
    const board = makeBoard({
      cards: { c1: { id: "c1", title: "Fine", details: "", due_date: futureDate } },
    });
    render(<BoardStats board={board} />);
    expect(screen.queryByText("overdue")).not.toBeInTheDocument();
  });

  it("shows checklist progress when cards have checklist items", () => {
    const board = makeBoard({
      cards: {
        c1: {
          id: "c1",
          title: "Checklist card",
          details: "",
          checklist: [
            { id: "i1", text: "Step 1", done: true },
            { id: "i2", text: "Step 2", done: false },
          ],
        },
      },
    });
    render(<BoardStats board={board} />);
    expect(screen.getByText("1 / 2")).toBeInTheDocument();
    expect(screen.getByText("checklist")).toBeInTheDocument();
  });

  it("does not show checklist section when no checklist items exist", () => {
    render(<BoardStats board={makeBoard()} />);
    expect(screen.queryByText("checklist")).not.toBeInTheDocument();
  });
});
