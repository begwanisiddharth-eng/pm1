import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { ShortcutsModal } from "@/components/ShortcutsModal";

describe("ShortcutsModal", () => {
  it("renders shortcut rows", () => {
    render(<ShortcutsModal onClose={vi.fn()} />);
    expect(screen.getByRole("dialog", { name: /keyboard shortcuts/i })).toBeInTheDocument();
    expect(screen.getByText("Open this shortcut reference")).toBeInTheDocument();
    expect(screen.getByText("Send message")).toBeInTheDocument();
  });

  it("calls onClose when Escape is pressed", async () => {
    const onClose = vi.fn();
    render(<ShortcutsModal onClose={onClose} />);
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when backdrop is clicked", async () => {
    const onClose = vi.fn();
    render(<ShortcutsModal onClose={onClose} />);
    const backdrop = screen.getByLabelText("Shortcuts modal backdrop");
    await userEvent.click(backdrop);
    expect(onClose).toHaveBeenCalled();
  });

  it("does not close when modal panel is clicked", async () => {
    const onClose = vi.fn();
    render(<ShortcutsModal onClose={onClose} />);
    const dialog = screen.getByRole("dialog", { name: /keyboard shortcuts/i });
    await userEvent.click(dialog);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("calls onClose when close button is clicked", async () => {
    const onClose = vi.fn();
    render(<ShortcutsModal onClose={onClose} />);
    await userEvent.click(screen.getByRole("button", { name: "Close shortcuts modal" }));
    expect(onClose).toHaveBeenCalled();
  });
});
