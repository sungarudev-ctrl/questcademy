"use client";

import React, { useState } from "react";
import { Sparkles, X, Send, Bot, User, Loader2 } from "lucide-react";
import { askAiTutor } from "@/lib/api/studentClient";
import { BlockRenderer } from "../render/BlockRenderer";

export interface AskAiSidePanelProps {
  nodeId: string;
  nodeTitle: string;
  isOpen: boolean;
  onClose: () => void;
}

interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
}

export function AskAiSidePanel({
  nodeId,
  nodeTitle,
  isOpen,
  onClose,
}: AskAiSidePanelProps): React.ReactElement | null {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "intro",
      sender: "ai",
      text: `Hi! I'm your AI learning tutor for **${nodeTitle}**. What questions do you have about this topic? Ask me anything or request an explanation!`,
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const prompt = input.trim();
    if (!prompt || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: prompt,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await askAiTutor(prompt, { nodeId });
      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: "ai",
        text: response.reply,
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          sender: "ai",
          text: "I'm having a little trouble connecting right now, but let's review the main idea: try finding the lowest common multiple first!",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <aside
      className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col transition-all duration-300 animate-in slide-in-from-right"
      data-testid="ask-ai-panel"
      aria-label="AI Tutor Assistant"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/90 backdrop-blur">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm">Ask AI Tutor</h3>
            <p className="text-xs text-slate-400 truncate max-w-[200px]">{nodeTitle}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          aria-label="Close tutor panel"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex gap-3 text-sm ${m.sender === "user" ? "justify-end" : "justify-start"}`}
          >
            {m.sender === "ai" && (
              <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-white shrink-0 mt-0.5">
                <Bot className="w-4 h-4" />
              </div>
            )}
            <div
              className={`rounded-2xl px-4 py-3 max-w-[85%] ${
                m.sender === "user"
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-800/90 text-slate-200 border border-slate-700/60"
              }`}
            >
              {m.sender === "ai" ? (
                <BlockRenderer
                  blocks={[{ type: "text", payload: { text: m.text } }]}
                  className="space-y-1 text-sm text-slate-200"
                />
              ) : (
                <p className="leading-relaxed">{m.text}</p>
              )}
            </div>
            {m.sender === "user" && (
              <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 shrink-0 mt-0.5">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-slate-400 pl-10">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
            <span>Tutor is thinking...</span>
          </div>
        )}
      </div>

      {/* Input Box */}
      <form onSubmit={handleSend} className="p-4 border-t border-slate-800 bg-slate-900/90 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about this step..."
          className="flex-1 rounded-xl bg-slate-800/90 border border-slate-700 px-3.5 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          aria-label="Send message to tutor"
          className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </aside>
  );
}
