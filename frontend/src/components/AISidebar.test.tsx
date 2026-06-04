/// <reference types="vitest/globals" />
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { AISidebar } from "@/components/AISidebar";
import { chatWithBoard } from "@/lib/api";
import { seedBoard } from "@/test/fixtures";

vi.mock("@/lib/api", () => ({
  saveBoard: vi.fn(),
  chatWithBoard: vi.fn(),
}));

const onBoardUpdate = vi.fn();

const renderSidebar = () =>
  render(<AISidebar boardId={1} onBoardUpdate={onBoardUpdate} />);

describe("AISidebar", () => {
  beforeEach(() => {
    vi.mocked(chatWithBoard).mockClear();
    onBoardUpdate.mockClear();
  });

  it("renders message input and send button", () => {
    renderSidebar();
    expect(screen.getByLabelText("Message")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send message" })).toBeInTheDocument();
  });

  it("shows the user message after sending", async () => {
    vi.mocked(chatWithBoard).mockResolvedValue({ message: "Got it!", board: null });
    renderSidebar();
    await userEvent.type(screen.getByLabelText("Message"), "Hello AI");
    await userEvent.click(screen.getByRole("button", { name: "Send message" }));
    expect(screen.getByText("Hello AI")).toBeInTheDocument();
  });

  it("shows the AI response in the conversation", async () => {
    vi.mocked(chatWithBoard).mockResolvedValue({ message: "I can help!", board: null });
    renderSidebar();
    await userEvent.type(screen.getByLabelText("Message"), "What can you do?");
    await userEvent.click(screen.getByRole("button", { name: "Send message" }));
    await waitFor(() => expect(screen.getByText("I can help!")).toBeInTheDocument());
  });

  it("shows loading indicator while waiting for AI", async () => {
    let resolveChat!: (v: { message: string; board: null }) => void;
    vi.mocked(chatWithBoard).mockReturnValue(
      new Promise((r) => { resolveChat = r; })
    );
    renderSidebar();
    await userEvent.type(screen.getByLabelText("Message"), "Thinking…");
    await userEvent.click(screen.getByRole("button", { name: "Send message" }));
    expect(screen.getByLabelText("AI is thinking")).toBeInTheDocument();
    resolveChat({ message: "Done", board: null });
    await waitFor(() =>
      expect(screen.queryByLabelText("AI is thinking")).not.toBeInTheDocument()
    );
  });

  it("shows error alert on network failure", async () => {
    vi.mocked(chatWithBoard).mockRejectedValue(new Error("Network error"));
    renderSidebar();
    await userEvent.type(screen.getByLabelText("Message"), "Hello");
    await userEvent.click(screen.getByRole("button", { name: "Send message" }));
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
  });

  it("calls onBoardUpdate when AI returns a board", async () => {
    vi.mocked(chatWithBoard).mockResolvedValue({
      message: "Updated the board.",
      board: seedBoard,
    });
    renderSidebar();
    await userEvent.type(screen.getByLabelText("Message"), "Update the board");
    await userEvent.click(screen.getByRole("button", { name: "Send message" }));
    await waitFor(() =>
      expect(onBoardUpdate).toHaveBeenCalledWith(seedBoard)
    );
  });

  it("clears chat history when clear button is clicked", async () => {
    vi.mocked(chatWithBoard).mockResolvedValue({ message: "Got it!", board: null });
    renderSidebar();
    await userEvent.type(screen.getByLabelText("Message"), "Hello");
    await userEvent.click(screen.getByRole("button", { name: "Send message" }));
    await waitFor(() => expect(screen.getByText("Hello")).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: "Clear chat" }));
    expect(screen.queryByText("Hello")).not.toBeInTheDocument();
  });
});
