"use client";

import { useState } from "react";
import { login, register } from "@/lib/api";

type Mode = "login" | "register";

type LoginFormProps = {
  onLogin: (username: string) => void;
};

export const LoginForm = ({ onLogin }: LoginFormProps) => {
  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setUsername("");
    setPassword("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "register") {
        await register(username, password);
        await login(username, password);
      } else {
        await login(username, password);
      }
      onLogin(username);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const isLogin = mode === "login";

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--surface)]">
      <div className="w-full max-w-sm rounded-3xl border border-[var(--stroke)] bg-white p-10 shadow-[var(--shadow)]">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--gray-text)]">
          Project Management
        </p>
        <h1 className="mt-3 font-display text-3xl font-semibold text-[var(--navy-dark)]">
          {isLogin ? "Sign in" : "Create account"}
        </h1>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label
              htmlFor="username"
              className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--gray-text)]"
            >
              Username
            </label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="rounded-xl border border-[var(--stroke)] px-4 py-3 text-sm text-[var(--navy-dark)] outline-none focus:border-[var(--primary-blue)] focus:ring-1 focus:ring-[var(--primary-blue)]"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label
              htmlFor="password"
              className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--gray-text)]"
            >
              Password
              {!isLogin && (
                <span className="ml-2 font-normal normal-case tracking-normal text-[var(--gray-text)]">
                  (min. 6 characters)
                </span>
              )}
            </label>
            <input
              id="password"
              type="password"
              autoComplete={isLogin ? "current-password" : "new-password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-xl border border-[var(--stroke)] px-4 py-3 text-sm text-[var(--navy-dark)] outline-none focus:border-[var(--primary-blue)] focus:ring-1 focus:ring-[var(--primary-blue)]"
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="mt-2 rounded-xl bg-[var(--secondary-purple)] px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {loading
              ? isLogin ? "Signing in..." : "Creating account..."
              : isLogin ? "Sign in" : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--gray-text)]">
          {isLogin ? "No account?" : "Already have an account?"}{" "}
          <button
            type="button"
            onClick={() => switchMode(isLogin ? "register" : "login")}
            className="font-semibold text-[var(--primary-blue)] hover:underline"
          >
            {isLogin ? "Create one" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
};
