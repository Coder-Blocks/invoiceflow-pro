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
    if (!finalQuestion) return;

    setMessages((prev) => [...prev, { role: "user", text: finalQuestion }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai-brain/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question: finalQuestion }),
      });

      const json = await res.json();

      if (!json.success) {
        setMessages((prev) => [
          ...prev,
          { role: "ai", text: "Something went wrong." },
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
      { role: "ai", text: "Chat cleared. Ask something new." },
    ]);
  }

  return (
    <div className="mx-auto max-w-6xl p-6 space-y-6">

      {/* HEADER */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-700 text-white p-6 rounded-3xl shadow">
        <h1 className="text-3xl font-bold">🤖 AI Business Brain</h1>
        <p className="text-blue-100 mt-1">
          Free AI Assistant for your business
        </p>
      </div>

      <div className="grid lg:grid-cols-[1fr_300px] gap-6">

        {/* CHAT */}
        <div className="bg-white rounded-3xl shadow flex flex-col h-[600px]">

          {/* TOP */}
          <div className="flex justify-between items-center border-b p-4">
            <h2 className="font-bold">AI Chat</h2>
            <button
              onClick={clearChat}
              className="text-sm border px-3 py-1 rounded"
            >
              Clear
            </button>
          </div>

          {/* MESSAGES */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
            {messages.map((m, i) => (
              <Bubble key={i} message={m} />
            ))}

            {loading && (
              <div className="text-sm text-gray-500">
                AI is thinking...
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* INPUT */}
          <div className="border-t p-3 flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && askAI()}
              placeholder="Ask something..."
              className="flex-1 border rounded px-3 py-2"
            />
            <button
              onClick={() => askAI()}
              className="bg-blue-600 text-white px-4 rounded"
            >
              Send
            </button>
          </div>

        </div>

        {/* SIDE PANEL */}
        <div className="space-y-4">

          {/* QUICK */}
          <div className="bg-white p-4 rounded-2xl shadow">
            <h3 className="font-semibold mb-2">Quick Questions</h3>
            {quickQuestions.map((q) => (
              <button
                key={q}
                onClick={() => askAI(q)}
                className="block w-full text-left border rounded px-3 py-2 mb-2 text-sm hover:bg-blue-50"
              >
                {q}
              </button>
            ))}
          </div>

          {/* INFO */}
          <div className="bg-green-50 p-4 rounded-2xl">
            <h3 className="font-semibold text-green-700">
              Free AI Mode
            </h3>
            <p className="text-sm text-green-600 mt-1">
              Works without API key using your own data.
            </p>
          </div>

        </div>

      </div>
    </div>
  );
}

// =====================
// CHAT BUBBLE
// =====================

function Bubble({ message }: { message: Message }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`px-4 py-2 rounded-xl max-w-[75%] text-sm ${
          isUser
            ? "bg-blue-600 text-white"
            : "bg-white border"
        }`}
      >
        {message.text}
      </div>
    </div>
  );
}