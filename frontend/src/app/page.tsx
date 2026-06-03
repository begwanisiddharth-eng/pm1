"use client";

import { useEffect, useState } from "react";
import { KanbanBoard } from "@/components/KanbanBoard";
import { LoginForm } from "@/components/LoginForm";
import { getMe, logout, getBoard } from "@/lib/api";
import type { BoardData } from "@/lib/kanban";

type Phase = "loading" | "unauthenticated" | "board-error" | "ready";

export default function Page() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [board, setBoard] = useState<BoardData | null>(null);

  useEffect(() => {
    getMe()
      .then((user) => {
        if (!user) { setPhase("unauthenticated"); return; }
        return getBoard()
          .then((b) => { setBoard(b); setPhase("ready"); })
          .catch(() => setPhase("board-error"));
      })
      .catch(() => setPhase("unauthenticated"));
  }, []);

  const handleLogin = () => {
    setPhase("loading");
    getBoard()
      .then((b) => { setBoard(b); setPhase("ready"); })
      .catch(() => setPhase("board-error"));
  };

  const handleLogout = async () => {
    await logout();
    setBoard(null);
    setPhase("unauthenticated");
  };

  if (phase === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="text-sm text-[var(--gray-text)]">Loading...</span>
      </div>
    );
  }

  if (phase === "unauthenticated") {
    return <LoginForm onLogin={handleLogin} />;
  }

  if (phase === "board-error" || !board) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="text-sm text-red-600">
          Failed to load board. Please refresh.
        </span>
      </div>
    );
  }

  return <KanbanBoard initialBoard={board} onLogout={handleLogout} />;
}
