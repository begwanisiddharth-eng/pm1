import type { BoardData } from "@/lib/kanban";

export type ChatMessage = { role: "user" | "assistant"; content: string };

export type ChatResponse = {
  message: string;
  board: BoardData | null;
};

export type BoardSummary = {
  id: number;
  name: string;
  updated_at: string;
};

export async function getMe(): Promise<{ username: string } | null> {
  const res = await fetch("/api/auth/me");
  if (res.status === 401) return null;
  if (!res.ok) throw new Error("Failed to check session");
  return res.json();
}

export async function login(username: string, password: string): Promise<void> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (res.status === 401) throw new Error("Invalid credentials");
  if (!res.ok) throw new Error("Login failed");
}

export async function register(username: string, password: string): Promise<void> {
  const res = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (res.status === 409) throw new Error("Username already taken");
  if (res.status === 400) {
    const data = await res.json();
    throw new Error(data.detail ?? "Invalid registration details");
  }
  if (!res.ok) throw new Error("Registration failed");
}

export async function logout(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST" });
}

export async function listBoards(): Promise<BoardSummary[]> {
  const res = await fetch("/api/boards");
  if (!res.ok) throw new Error("Failed to load boards");
  return res.json();
}

export async function createBoard(name: string): Promise<BoardSummary> {
  const res = await fetch("/api/boards", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error("Failed to create board");
  return res.json();
}

export async function getBoard(boardId: number): Promise<BoardData> {
  const res = await fetch(`/api/boards/${boardId}`);
  if (!res.ok) throw new Error("Failed to load board");
  return res.json();
}

export async function saveBoard(boardId: number, board: BoardData): Promise<void> {
  const res = await fetch(`/api/boards/${boardId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(board),
  });
  if (!res.ok) throw new Error("Failed to save board");
}

export async function renameBoard(boardId: number, name: string): Promise<BoardSummary> {
  const res = await fetch(`/api/boards/${boardId}/name`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error("Failed to rename board");
  return res.json();
}

export async function deleteBoard(boardId: number): Promise<void> {
  const res = await fetch(`/api/boards/${boardId}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete board");
}

export async function chatWithBoard(
  message: string,
  history: ChatMessage[],
  boardId: number,
): Promise<ChatResponse> {
  const res = await fetch("/api/ai/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history, board_id: boardId }),
  });
  if (!res.ok) throw new Error("AI request failed");
  return res.json();
}
