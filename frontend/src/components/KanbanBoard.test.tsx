import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { KanbanBoard } from "@/components/KanbanBoard";
import { initialData } from "@/lib/kanban";
import { saveBoard } from "@/lib/api";

vi.mock("@/lib/api", () => ({
  saveBoard: vi.fn().mockResolvedValue(undefined),
  chatWithBoard: vi.fn(),
}));

const renderBoard = () =>
  render(<KanbanBoard initialBoard={initialData} onLogout={vi.fn()} />);

const getFirstColumn = () => screen.getAllByTestId(/^column-/)[0];

describe("KanbanBoard", () => {
  beforeEach(() => {
    vi.mocked(saveBoard).mockClear();
  });

  it("renders five columns", () => {
    renderBoard();
    expect(screen.getAllByTestId(/^column-/)).toHaveLength(5);
  });

  it("renames a column on blur and saves", async () => {
    renderBoard();
    const column = getFirstColumn();
    const input = within(column).getByLabelText("Column title");
    await userEvent.clear(input);
    await userEvent.type(input, "New Name");
    expect(input).toHaveValue("New Name");
    await userEvent.tab();
    await waitFor(() =>
      expect(vi.mocked(saveBoard)).toHaveBeenCalledWith(
        expect.objectContaining({
          columns: expect.arrayContaining([
            expect.objectContaining({ title: "New Name" }),
          ]),
        })
      )
    );
  });

  it("adds a card and saves", async () => {
    renderBoard();
    const column = getFirstColumn();
    await userEvent.click(
      within(column).getByRole("button", { name: /add a card/i })
    );
    await userEvent.type(
      within(column).getByPlaceholderText(/card title/i),
      "New card"
    );
    await userEvent.type(within(column).getByPlaceholderText(/details/i), "Notes");
    await userEvent.click(
      within(column).getByRole("button", { name: /^add card$/i })
    );
    expect(within(column).getByText("New card")).toBeInTheDocument();
    await waitFor(() => expect(vi.mocked(saveBoard)).toHaveBeenCalled());
  });

  it("deletes a card and saves", async () => {
    renderBoard();
    const column = getFirstColumn();
    await userEvent.click(
      within(column).getByRole("button", { name: "Delete Align roadmap themes" })
    );
    expect(
      within(column).queryByText("Align roadmap themes")
    ).not.toBeInTheDocument();
    await waitFor(() => expect(vi.mocked(saveBoard)).toHaveBeenCalled());
  });

  it("edits a card title and details then saves", async () => {
    renderBoard();
    const column = getFirstColumn();
    await userEvent.click(
      within(column).getByRole("button", {
        name: "Edit Align roadmap themes",
      })
    );
    const titleInput = within(column).getByLabelText("Card title");
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, "Updated title");
    const detailsInput = within(column).getByLabelText("Card details");
    await userEvent.clear(detailsInput);
    await userEvent.type(detailsInput, "Updated details");
    await userEvent.click(within(column).getByRole("button", { name: "Save" }));
    expect(within(column).getByText("Updated title")).toBeInTheDocument();
    expect(within(column).getByText("Updated details")).toBeInTheDocument();
    await waitFor(() =>
      expect(vi.mocked(saveBoard)).toHaveBeenCalledWith(
        expect.objectContaining({
          cards: expect.objectContaining({
            "card-1": expect.objectContaining({
              title: "Updated title",
              details: "Updated details",
            }),
          }),
        })
      )
    );
  });

  it("cancels card edit without saving", async () => {
    renderBoard();
    const column = getFirstColumn();
    await userEvent.click(
      within(column).getByRole("button", {
        name: "Edit Align roadmap themes",
      })
    );
    const titleInput = within(column).getByLabelText("Card title");
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, "Should not appear");
    await userEvent.click(within(column).getByRole("button", { name: "Cancel" }));
    expect(within(column).getByText("Align roadmap themes")).toBeInTheDocument();
    expect(vi.mocked(saveBoard)).not.toHaveBeenCalled();
  });
});
