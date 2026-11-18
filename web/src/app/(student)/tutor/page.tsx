"use client";

import React, { useState } from "react";
import {
  Bot,
  Send,
  Sparkles,
  Paperclip,
  Image as ImageIcon,
  User,
  Loader2,
  Lightbulb,
} from "lucide-react";
import { useLearnerStore } from "@/lib/stores/useLearnerStore";
import { askAiTutor } from "@/lib/api/studentClient";
import { BlockRenderer } from "@/components/render/BlockRenderer";
import type { ContentBlock } from "@/types";

interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
  blocks?: ContentBlock[];
  attachmentName?: string;
}

const STARTER_PROMPTS = [
  "How do I find a common denominator for fractions with different numbers?",
  "Can you explain why $3x + 5 = 20$ means $x = 5$?",
  "What is the simplest way to remember the Pythagorean theorem?",
  "Can you give me a real-world example of ratios?",
];

export default function TutorPage() {
  const { frameworkId, countryCode } = useLearnerStore();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "ai",
      text: "Hello! I am your Socratic AI Tutor, aligned with your curriculum framework. What concept would you like to explore today?",
      blocks: [
        {
          block_id: "wb-1",
          node_id: "GLOBAL",
          type: "paragraph",
          ordinal: 1,
          payload: {
            text: `Hello! I'm your Socratic AI Tutor for **${frameworkId}** (${countryCode}). I won't just give you the answers — I'll guide you through each step so you truly understand the concepts.`,
          },
        },
        {
          block_id: "wb-2",
          node_id: "GLOBAL",
          type: "callout",
          ordinal: 2,
          payload: {
            title: "How to use your Tutor",
            text: "Ask questions, paste math problems, or click any starter topic below to begin.",
          },
        },
      ],
    },
  ]);

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [attachment, setAttachment] = useState<string | null>(null);

  const handleSend = async (promptToSend?: string) => {
    const query = promptToSend || input;
    if (!query.trim() || isLoading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: query,
      attachmentName: attachment || undefined,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setAttachment(null);
    setIsLoading(true);

    try {
      const res = await askAiTutor(query, { frameworkId });

      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        sender: "ai",
        text: res.reply,
        blocks: [
          {
            block_id: `b-${Date.now()}`,
            node_id: "TUTOR",
            type: "paragraph",
            ordinal: 1,
            payload: { text: res.reply },
          },
        ],
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          sender: "ai",
          text: "Let's explore this together! What part of this equation feels most challenging to start with?",
          blocks: [
            {
              block_id: `b-err-${Date.now()}`,
              node_id: "TUTOR",
              type: "paragraph",
              ordinal: 1,
              payload: {
                text: "Let's break this down together! Which step of the problem would you like to inspect first?",
              },
            },
          ],
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAttachMockImage = () => {
    setAttachment("diagram_photo.jpg");
  };

  return (
    <div className="max-w-4xl mx-auto py-4 space-y-6" data-testid="tutor-page">
      {/* Header Banner */}
      <div className="flex items-center justify-between p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-lg shadow-indigo-600/20">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Socratic AI Tutor</h1>
            <p className="text-xs text-slate-400">
              Personalized guidance aligned to {frameworkId} · Always ready to help
            </p>
          </div>
        </div>
      </div>

      {/* Chat Conversation History */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-4 sm:p-6 min-h-[480px] max-h-[600px] overflow-y-auto space-y-6">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex gap-3.5 ${m.sender === "user" ? "justify-end" : "justify-start"}`}
          >
            {m.sender === "ai" && (
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shrink-0 mt-1 shadow-md shadow-indigo-600/20">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div
              className={`rounded-2xl p-5 max-w-[85%] sm:max-w-[75%] shadow-lg ${
                m.sender === "user"
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-900/90 border border-slate-800 text-slate-200"
              }`}
            >
              {m.attachmentName && (
                <div className="mb-2 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-700/50 text-indigo-200 text-xs">
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>{m.attachmentName}</span>
                </div>
              )}

              {m.sender === "ai" && m.blocks ? (
                <BlockRenderer blocks={m.blocks} className="space-y-3 text-sm text-slate-200" />
              ) : (
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.text}</p>
              )}
            </div>

            {m.sender === "user" && (
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0 mt-1">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2.5 text-xs text-slate-400 pl-11">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
            <span>AI Tutor is preparing your explanation...</span>
          </div>
        )}
      </div>

      {/* Starter Prompts */}
      {messages.length <= 2 && (
        <div className="space-y-2">
          <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
            <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
            <span>Suggested questions to get started:</span>
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {STARTER_PROMPTS.map((prompt, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSend(prompt)}
                className="p-3 rounded-xl bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 text-left text-xs text-slate-300 hover:text-white transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="rounded-2xl border border-slate-800 bg-slate-900/90 p-3 shadow-xl space-y-2"
      >
        {attachment && (
          <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs">
            <span className="flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Attached: {attachment}</span>
            </span>
            <button
              type="button"
              onClick={() => setAttachment(null)}
              className="text-slate-400 hover:text-white"
            >
              ×
            </button>
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleAttachMockImage}
            title="Upload photo of written problem"
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask your tutor anything about mathematics, formulas, or concepts..."
            className="flex-1 bg-transparent px-3 py-2 text-sm text-white placeholder-slate-400 focus:outline-none"
          />

          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white transition-all shadow-md shadow-indigo-600/20 hover:scale-105"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
