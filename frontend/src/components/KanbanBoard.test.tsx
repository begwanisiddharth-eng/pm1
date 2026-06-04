import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { KanbanBoard } from "@/components/KanbanBoard";
import { initialData } from "@/lib/kanban";
import { saveBoard } from "@/lib/api";

vi.mock("@/lib/api", () => ({
  saveBoard: vi.fn().mockResolvedValue(undefined),
  renameBoard: vi.fn().mockResolvedValue({ id: 1, name: "Test Board", updated_at: "" }),
  deleteBoard: vi.fn().mockResolvedValue(undefined),
  chatWithBoard: vi.fn(),
  createBoard: vi.fn(),
  changePassword: vi.fn().mockResolvedValue(undefined),
}));

const BOARD_ID = 1;

const renderBoard = () =>
  render(
    <KanbanBoard
      initialBoard={initialData}
      boardId={BOARD_ID}
      boardName="Test Board"
      username="testuser"
      onLogout={vi.fn()}
      onSwitchBoards={vi.fn()}
      onBoardRenamed={vi.fn()}
      onBoardDeleted={vi.fn()}
    />
  );

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
        BOARD_ID,
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

  it("archives a card and saves", async () => {
    renderBoard();
    const column = getFirstColumn();
    await userEvent.click(
      within(column).getByRole("button", { name: "Archive Align roadmap themes" })
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
        BOARD_ID,
        expect.objectContaining({
          cards: expect.objectContaining({
            "card-1": expect.objectContaining({
              title: "Updated title",
              details: "Updated details",
              priority: null,
              due_date: null,
              labels: [],
              checklist: [],
              comments: [],
              color: null,
            }),
          }),
        })
      )
    );
  });

  it("rolls back UI state when save fails", async () => {
    vi.mocked(saveBoard).mockRejectedValueOnce(new Error("Network error"));
    renderBoard();
    const column = getFirstColumn();
    const originalTitle = "Align roadmap themes";
    await userEvent.click(
      within(column).getByRole("button", { name: `Edit ${originalTitle}` })
    );
    const titleInput = within(column).getByLabelText("Card title");
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, "Will be rolled back");
    await userEvent.click(within(column).getByRole("button", { name: "Save" }));
    await waitFor(() => expect(vi.mocked(saveBoard)).toHaveBeenCalled());
    await waitFor(() =>
      expect(within(column).getByText(originalTitle)).toBeInTheDocument()
    );
    expect(within(column).queryByText("Will be rolled back")).not.toBeInTheDocument();
  });

  it("shows profile menu on avatar click and opens change password modal", async () => {
    renderBoard();
    await userEvent.click(screen.getByRole("button", { name: "Profile menu" }));
    expect(screen.getByText("Change password")).toBeInTheDocument();
    expect(screen.getByText("Sign out")).toBeInTheDocument();
    await userEvent.click(screen.getByText("Change password"));
    expect(screen.getByLabelText("Current password")).toBeInTheDocument();
  });

  it("sets card color accent and saves", async () => {
    renderBoard();
    const column = getFirstColumn();
    await userEvent.click(
      within(column).getByRole("button", { name: "Edit Align roadmap themes" })
    );
    await userEvent.click(within(column).getByRole("button", { name: "Red" }));
    await userEvent.click(within(column).getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(vi.mocked(saveBoard)).toHaveBeenCalledWith(
        BOARD_ID,
        expect.objectContaining({
          cards: expect.objectContaining({
            "card-1": expect.objectContaining({ color: "#ef4444" }),
          }),
        })
      )
    );
  });

  it("adds a comment in edit mode and saves", async () => {
    renderBoard();
    const column = getFirstColumn();
    await userEvent.click(
      within(column).getByRole("button", { name: "Edit Align roadmap themes" })
    );
    await userEvent.type(within(column).getByLabelText("New comment"), "Great progress!");
    await userEvent.click(within(column).getByRole("button", { name: "Add comment" }));
    await userEvent.click(within(column).getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(vi.mocked(saveBoard)).toHaveBeenCalledWith(
        BOARD_ID,
        expect.objectContaining({
          cards: expect.objectContaining({
            "card-1": expect.objectContaining({
              comments: expect.arrayContaining([
                expect.objectContaining({ text: "Great progress!" }),
              ]),
            }),
          }),
        })
      )
    );
  });

  it("duplicates a card and saves", async () => {
    renderBoard();
    const column = getFirstColumn();
    await userEvent.click(
      within(column).getByRole("button", { name: "Duplicate Align roadmap themes" })
    );
    expect(within(column).getByText("Align roadmap themes")).toBeInTheDocument();
    expect(within(column).getByText("Copy of Align roadmap themes")).toBeInTheDocument();
    await waitFor(() => expect(vi.mocked(saveBoard)).toHaveBeenCalled());
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
