import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { LoginForm } from "@/components/LoginForm";
import * as api from "@/lib/api";

describe("LoginForm", () => {
  it("renders username and password fields and a submit button", () => {
    render(<LoginForm onLogin={vi.fn()} />);

    expect(screen.getByLabelText("Username")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it("calls onLogin after successful login", async () => {
    vi.spyOn(api, "login").mockResolvedValueOnce(undefined);
    const onLogin = vi.fn();
    render(<LoginForm onLogin={onLogin} />);

    await userEvent.type(screen.getByLabelText("Username"), "user");
    await userEvent.type(screen.getByLabelText("Password"), "password");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(api.login).toHaveBeenCalledWith("user", "password");
    expect(onLogin).toHaveBeenCalledOnce();
  });

  it("shows an error message on failed login", async () => {
    vi.spyOn(api, "login").mockRejectedValueOnce(new Error("Invalid credentials"));
    render(<LoginForm onLogin={vi.fn()} />);

    await userEvent.type(screen.getByLabelText("Username"), "user");
    await userEvent.type(screen.getByLabelText("Password"), "wrong");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Invalid credentials");
    expect(screen.getByRole("heading", { name: /sign in/i })).toBeInTheDocument();
  });
});
