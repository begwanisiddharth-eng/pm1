"use client";

import { useEffect, useState } from "react";
import { KanbanBoard } from "@/components/KanbanBoard";
import { LoginForm } from "@/components/LoginForm";
import { BoardSelector } from "@/components/BoardSelector";
import { getMe, logout, listBoards, getBoard } from "@/lib/api";
import type { BoardData } from "@/lib/kanban";
import type { BoardSummary } from "@/lib/api";

type Phase =
  | "loading"
  | "unauthenticated"
  | "board-selection"
  | "board-loading"
  | "board-error"
  | "ready";

export default function Page() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [board, setBoard] = useState<BoardData | null>(null);
  const [boards, setBoards] = useState<BoardSummary[]>([]);
  const [activeBoard, setActiveBoard] = useState<BoardSummary | null>(null);
  const [username, setUsername] = useState<string>("");

  const loadBoard = (summary: BoardSummary) => {
    setActiveBoard(summary);
    setPhase("board-loading");
    getBoard(summary.id)
      .then((b) => { setBoard(b); setPhase("ready"); })
      .catch(() => setPhase("board-error"));
  };

  const fetchBoardsAndNavigate = (bs: BoardSummary[]) => {
    setBoards(bs);
    if (bs.length === 1) {
      loadBoard(bs[0]);
    } else {
      setPhase("board-selection");
    }
  };

  useEffect(() => {
    getMe()
      .then((user) => {
        if (!user) { setPhase("unauthenticated"); return; }
        setUsername(user.username);
        return listBoards()
          .then(fetchBoardsAndNavigate)
          .catch(() => setPhase("board-error"));
      })
      .catch(() => setPhase("unauthenticated"));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogin = (loggedInUsername: string) => {
    setUsername(loggedInUsername);
    setPhase("loading");
    listBoards()
      .then(fetchBoardsAndNavigate)
      .catch(() => setPhase("board-error"));
  };

  const handleLogout = async () => {
    await logout();
    setBoard(null);
    setActiveBoard(null);
    setBoards([]);
    setUsername("");
    setPhase("unauthenticated");
  };

  const handleBoardCreated = (summary: BoardSummary) => {
    const updated = [summary, ...boards];
    setBoards(updated);
    loadBoard(summary);
  };

  const handleSwitchBoards = () => {
    setBoard(null);
    setActiveBoard(null);
    setPhase("board-selection");
  };

  const handleBoardRenamed = (updated: BoardSummary) => {
    setBoards((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
    setActiveBoard(updated);
  };

  const handleBoardDeleted = (deletedId: number) => {
    const remaining = boards.filter((b) => b.id !== deletedId);
    setBoards(remaining);
    setBoard(null);
    setActiveBoard(null);
    setPhase("board-selection");
  };

  if (phase === "loading" || phase === "board-loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="text-sm text-[var(--gray-text)]">Loading...</span>
      </div>
    );
  }

  if (phase === "unauthenticated") {
    return <LoginForm onLogin={handleLogin} />;
  }

  if (phase === "board-selection") {
    return (
      <BoardSelector
        boards={boards}
        onSelect={loadBoard}
        onBoardCreated={handleBoardCreated}
        onLogout={handleLogout}
        username={username}
      />
    );
  }

  if (phase === "board-error" || !board || !activeBoard) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="text-sm text-red-600">
          Failed to load board. Please refresh.
        </span>
      </div>
    );
  }

  return (
    <KanbanBoard
      initialBoard={board}
      boardId={activeBoard.id}
      boardName={activeBoard.name}
      initialUpdatedAt={activeBoard.updated_at}
      username={username}
      onLogout={handleLogout}
      onSwitchBoards={handleSwitchBoards}
      onBoardRenamed={handleBoardRenamed}
      onBoardDeleted={handleBoardDeleted}
    />
  );
}
