import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { FilterBar } from "./FilterBar";
import type { CardFilter } from "@/lib/kanban";

const emptyFilter: CardFilter = { search: "", priority: null, overdueOnly: false };

describe("FilterBar", () => {
  it("renders search input and priority chips", () => {
    render(<FilterBar filter={emptyFilter} onChange={vi.fn()} />);
    expect(screen.getByPlaceholderText("Search cards...")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "All" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "High", exact: true })).toBeInTheDocument();
  });

  it("calls onChange with updated search value", async () => {
    const onChange = vi.fn();
    render(<FilterBar filter={emptyFilter} onChange={onChange} />);
    await userEvent.type(screen.getByPlaceholderText("Search cards..."), "b");
    expect(onChange).toHaveBeenLastCalledWith({ ...emptyFilter, search: "b" });
  });

  it("calls onChange with selected priority", async () => {
    const onChange = vi.fn();
    render(<FilterBar filter={emptyFilter} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "High", exact: true }));
    expect(onChange).toHaveBeenCalledWith({ ...emptyFilter, priority: "high" });
  });

  it("clears priority when the same chip is clicked again", async () => {
    const onChange = vi.fn();
    render(<FilterBar filter={{ ...emptyFilter, priority: "high" }} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "High", exact: true }));
    expect(onChange).toHaveBeenCalledWith({ ...emptyFilter, priority: null });
  });

  it("calls onChange when overdue toggle is clicked", async () => {
    const onChange = vi.fn();
    render(<FilterBar filter={emptyFilter} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Overdue only" }));
    expect(onChange).toHaveBeenCalledWith({ ...emptyFilter, overdueOnly: true });
  });

  it("shows Clear filters button when filter is active", () => {
    render(<FilterBar filter={{ ...emptyFilter, search: "x" }} onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Clear filters" })).toBeInTheDocument();
  });

  it("hides Clear filters button when filter is empty", () => {
    render(<FilterBar filter={emptyFilter} onChange={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Clear filters" })).not.toBeInTheDocument();
  });

  it("resets all filters when Clear filters is clicked", async () => {
    const onChange = vi.fn();
    render(
      <FilterBar
        filter={{ search: "x", priority: "high", overdueOnly: true }}
        onChange={onChange}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(onChange).toHaveBeenCalledWith({ search: "", priority: null, overdueOnly: false });
  });
});
