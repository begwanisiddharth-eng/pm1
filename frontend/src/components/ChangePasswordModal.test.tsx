import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { ChangePasswordModal } from "@/components/ChangePasswordModal";
import { changePassword } from "@/lib/api";

vi.mock("@/lib/api", () => ({
  changePassword: vi.fn(),
}));

const renderModal = (onClose = vi.fn()) =>
  render(<ChangePasswordModal onClose={onClose} />);

describe("ChangePasswordModal", () => {
  beforeEach(() => {
    vi.mocked(changePassword).mockClear();
  });

  it("renders all password fields", () => {
    renderModal();
    expect(screen.getByLabelText("Current password")).toBeInTheDocument();
    expect(screen.getByLabelText("New password")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirm new password")).toBeInTheDocument();
  });

  it("shows error when passwords do not match", async () => {
    renderModal();
    await userEvent.type(screen.getByLabelText("Current password"), "oldpass");
    await userEvent.type(screen.getByLabelText("New password"), "newpassword1");
    await userEvent.type(screen.getByLabelText("Confirm new password"), "newpassword2");
    await userEvent.click(screen.getByRole("button", { name: /change password/i }));
    expect(screen.getByRole("alert")).toHaveTextContent("do not match");
    expect(vi.mocked(changePassword)).not.toHaveBeenCalled();
  });

  it("shows error when new password is too short", async () => {
    renderModal();
    await userEvent.type(screen.getByLabelText("New password"), "abc");
    await userEvent.type(screen.getByLabelText("Confirm new password"), "abc");
    await userEvent.click(screen.getByRole("button", { name: /change password/i }));
    expect(screen.getByRole("alert")).toHaveTextContent("6 characters");
    expect(vi.mocked(changePassword)).not.toHaveBeenCalled();
  });

  it("calls changePassword and shows success", async () => {
    vi.mocked(changePassword).mockResolvedValue(undefined);
    renderModal();
    await userEvent.type(screen.getByLabelText("Current password"), "oldpass");
    await userEvent.type(screen.getByLabelText("New password"), "newpassword");
    await userEvent.type(screen.getByLabelText("Confirm new password"), "newpassword");
    await userEvent.click(screen.getByRole("button", { name: /change password/i }));
    await waitFor(() =>
      expect(vi.mocked(changePassword)).toHaveBeenCalledWith("oldpass", "newpassword")
    );
    expect(screen.getByText(/changed successfully/i)).toBeInTheDocument();
  });

  it("shows API error when changePassword rejects", async () => {
    vi.mocked(changePassword).mockRejectedValue(new Error("Current password is incorrect"));
    renderModal();
    await userEvent.type(screen.getByLabelText("Current password"), "wrong");
    await userEvent.type(screen.getByLabelText("New password"), "newpassword");
    await userEvent.type(screen.getByLabelText("Confirm new password"), "newpassword");
    await userEvent.click(screen.getByRole("button", { name: /change password/i }));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("incorrect")
    );
  });

  it("closes on Cancel click", async () => {
    const onClose = vi.fn();
    renderModal(onClose);
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("closes on backdrop click", async () => {
    const onClose = vi.fn();
    const { container } = renderModal(onClose);
    const backdrop = container.firstChild as HTMLElement;
    await userEvent.click(backdrop);
    expect(onClose).toHaveBeenCalled();
  });
});
