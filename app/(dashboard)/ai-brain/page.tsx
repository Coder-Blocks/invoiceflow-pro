"use client";

import { useEffect, useRef, useState } from "react";

type Message = {
  role: "user" | "ai";
  text: string;
};

const quickQuestions = [
  "What is my profit?",
  "Show pending amount",
  "Show low stock",
  "Which medicines are expiring?",
  "What is my payroll cost?",
  "Give me business summary",
];

export default function AIBrainPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "ai",
      text: "Hello 👋 I am your AI Business Brain. Ask anything about your business.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function askAI(question?: string) {
    const finalQuestion = (question || input).trim();
    if (!finalQuestion || loading) return;

    setMessages((prev) => [...prev, { role: "user", text: finalQuestion }]);
    setInput("");
    setLoading(true);

    try {
      // FIXED: correct API path
      const res = await fetch("/api/ai-brain", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: finalQuestion,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setMessages((prev) => [
          ...prev,
          { role: "ai", text: json?.error || "Something went wrong." },
        ]);
        return;
      }

      setMessages((prev) => [...prev, { role: "ai", text: json.answer }]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        { role: "ai", text: "Error connecting AI." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function clearChat() {
    setMessages([
      {
        role: "ai",
        text: "Hello 👋 I am your AI Business Brain. Ask anything about your business.",
      },
    ]);
    setInput("");
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
      <div className="rounded-3xl bg-gradient-to-r from-blue-700 to-indigo-700 p-6 text-white shadow">
        <h1 className="text-2xl font-bold md:text-3xl">🤖 AI Business Brain</h1>
        <p className="mt-1 text-sm text-blue-100 md:text-base">
          Free AI Assistant for your business
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="flex h-[600px] flex-col rounded-3xl bg-white shadow">
          <div className="flex items-center justify-between border-b p-4">
            <h2 className="font-bold">AI Chat</h2>
            <button
              onClick={clearChat}
              className="rounded border px-3 py-1 text-sm hover:bg-slate-50"
            >
              Clear
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto bg-gray-50 p-4">
            {messages.map((m, i) => (
              <Bubble key={i} message={m} />
            ))}

            {loading && (
              <div className="text-sm text-gray-500">AI is thinking...</div>
            )}

            <div ref={bottomRef} />
          </div>

          <div className="flex gap-2 border-t p-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && askAI()}
              placeholder="Ask something..."
              className="flex-1 rounded border px-3 py-2"
            />
            <button
              onClick={() => askAI()}
              disabled={loading}
              className="rounded bg-blue-600 px-4 text-white disabled:opacity-70"
            >
              Send
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl bg-white p-4 shadow">
            <h3 className="mb-2 font-semibold">Quick Questions</h3>
            {quickQuestions.map((q) => (
              <button
                key={q}
                onClick={() => askAI(q)}
                disabled={loading}
                className="mb-2 block w-full rounded border px-3 py-2 text-left text-sm hover:bg-blue-50 disabled:opacity-70"
              >
                {q}
              </button>
            ))}
          </div>

          <div className="rounded-2xl bg-green-50 p-4">
            <h3 className="font-semibold text-green-700">Free AI Mode</h3>
            <p className="mt-1 text-sm text-green-600">
              Works without API key using your own data.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Bubble({ message }: { message: Message }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[75%] rounded-xl px-4 py-2 text-sm whitespace-pre-line ${
          isUser ? "bg-blue-600 text-white" : "border bg-white"
        }`}
      >
        {message.text}
      </div>
    </div>
  );
}