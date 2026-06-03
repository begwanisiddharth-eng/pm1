"use client";

import { useEffect, useRef, useState } from "react";
import { chatWithBoard, type ChatMessage } from "@/lib/api";
import type { BoardData } from "@/lib/kanban";

type Props = {
  onBoardUpdate: (board: BoardData) => void;
};

export const AISidebar = ({ onBoardUpdate }: Props) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messages.length === 0 && !loading) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const userMessage: ChatMessage = { role: "user", content: text };
    const nextHistory = [...messages, userMessage];
    setMessages(nextHistory);
    setInput("");
    setLoading(true);
    setError(null);
    try {
      const result = await chatWithBoard(text, messages);
      setMessages([...nextHistory, { role: "assistant", content: result.message }]);
      if (result.board) {
        onBoardUpdate(result.board);
      }
    } catch {
      setError("Failed to reach the AI assistant. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="sticky top-6 flex h-96 w-80 flex-shrink-0 flex-col rounded-2xl border border-[var(--stroke)] bg-white/90 shadow-[var(--shadow)] backdrop-blur"
      data-testid="ai-sidebar"
    >
      <div className="border-b border-[var(--stroke)] px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--gray-text)]">
          AI Assistant
        </p>
        <p className="mt-1 text-sm text-[var(--navy-dark)]">
          Ask me to update your board
        </p>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 && !loading && (
          <p className="mt-8 text-center text-xs text-[var(--gray-text)]">
            Ask me to reorganize cards, rename columns, or suggest improvements.
          </p>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-[var(--primary-blue)] text-white"
                  : "border border-[var(--stroke)] bg-[var(--surface)] text-[var(--navy-dark)]"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div
              className="rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] px-4 py-3"
              aria-label="AI is thinking"
            >
              <span className="inline-flex gap-1">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--gray-text)] [animation-delay:0ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--gray-text)] [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--gray-text)] [animation-delay:300ms]" />
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {error && (
        <div
          role="alert"
          className="mx-4 mb-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs text-red-600"
        >
          {error}
        </div>
      )}

      <div className="border-t border-[var(--stroke)] px-4 py-3">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
            }}
            placeholder="Ask the AI assistant…"
            aria-label="Message"
            rows={2}
            className="flex-1 resize-none rounded-xl border border-[var(--stroke)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--navy-dark)] placeholder:text-[var(--gray-text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-blue)]/30"
          />
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={!input.trim() || loading}
            aria-label="Send message"
            className="self-end rounded-xl bg-[var(--primary-blue)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};
