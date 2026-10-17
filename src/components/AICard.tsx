'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '@/context/StoreContext';
import { formatPeso } from '@/lib/formulas';
import { Sparkles, Send, CheckCircle2, AlertCircle, PackagePlus, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';

interface ChatItem {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  itemsAdded?: Array<{
    id: string;
    name: string;
    cost_price: number;
    selling_price: number;
    quantity: number;
  }>;
}

export function AICard({ className = '' }: { className?: string }) {
  const { refreshData } = useStore();

  const [inputPrompt, setInputPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatItem[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Hello! I am your AI Store Assistant. Just list or type your products here (e.g. "Coke Mismo buy 15 sell 20 stock 24") and I will automatically add them to your Inventory. If any detail is missing like stock or cost price, I\'ll ask you so we can complete it right away!',
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (customText?: string) => {
    const textToSend = customText || inputPrompt;
    if (!textToSend.trim() || loading) return;

    const userMsgId = Date.now().toString();
    const newMessages: ChatItem[] = [
      ...messages,
      { id: userMsgId, role: 'user', content: textToSend.trim() },
    ];
    setMessages(newMessages);
    setInputPrompt('');
    setLoading(true);

    try {
      // Build lightweight conversation history
      const historyPayload = newMessages.slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch('/api/ai-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: textToSend.trim(),
          history: historyPayload,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to reach AI service.');
      }

      // If items were inserted into Supabase automatically
      if (data.itemsAdded && data.itemsAdded.length > 0) {
        await refreshData();
        try {
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.8 },
            colors: ['#10B981', '#34D399', '#38BDF8', '#F59E0B'],
          });
        } catch {
          // Fallback
        }
      }

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.message || 'Action completed.',
          itemsAdded: data.itemsAdded || [],
        },
      ]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error reaching AI assistant.';
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `Sorry, there was an issue: ${msg}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`cool-card p-5 sm:p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-3.5 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                AI Store Assistant
              </h2>
              <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200/60">
                Auto-Add
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 font-normal">
              Type or paste your products, cost price, and stock to automatically save them to your store.
            </p>
          </div>
        </div>
      </div>

      {/* Conversation & Action Feed */}
      <div className="max-h-72 overflow-y-auto space-y-3 pr-1 text-xs sm:text-sm">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${
              msg.role === 'user' ? 'items-end' : 'items-start'
            } animate-in fade-in duration-200`}
          >
            <div
              className={`max-w-[90%] sm:max-w-[85%] rounded-2xl p-3.5 leading-relaxed text-xs sm:text-sm ${
                msg.role === 'user'
                  ? 'bg-emerald-600 text-white font-medium rounded-br-xs shadow-xs'
                  : 'bg-slate-50 text-slate-800 rounded-bl-xs border border-slate-200/60'
              }`}
            >
              <p className="whitespace-pre-line">{msg.content}</p>

              {/* Badges for Automatically Created Products */}
              {msg.itemsAdded && msg.itemsAdded.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-200/80 space-y-2">
                  <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-xs">
                    <CheckCircle2 className="w-4 h-4 stroke-[2.2]" />
                    <span>Automatically Added to Inventory ({msg.itemsAdded.length}):</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {msg.itemsAdded.map((item) => (
                      <div
                        key={item.id || item.name}
                        className="p-2.5 bg-white rounded-xl border border-emerald-200/70 shadow-xs flex justify-between items-center text-xs"
                      >
                        <div className="truncate pr-2">
                          <span className="font-bold text-slate-900 block truncate">{item.name}</span>
                          <span className="text-[11px] text-slate-500">
                            Cost: {formatPeso(item.cost_price)} &bull; Price: {formatPeso(item.selling_price)}
                          </span>
                        </div>
                        <span className="px-2 py-0.5 bg-emerald-600 text-white font-bold text-[10px] rounded-full shrink-0">
                          {item.quantity} pcs
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-xs text-emerald-700 font-semibold p-2 animate-pulse">
            <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            <span>AI is analyzing and adding your products...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts / Examples */}
      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
        <span className="text-slate-400 font-semibold shrink-0">Try:</span>
        <button
          type="button"
          onClick={() =>
            handleSend(
              'Add this: Lucky Me Pancit Canton buy 12 sell 16 stock 30, Coke Mismo buy 15 sell 20 stock 24'
            )
          }
          className="ios-tap-active cool-btn px-2.5 py-1 rounded-full text-slate-600 truncate shrink-0 cursor-pointer"
        >
          &quot;Pancit Canton buy 12 sell 16 stock 30...&quot;
        </button>
        <button
          type="button"
          onClick={() => handleSend('Add product: Magic Sarap buy 4 sell 6')}
          className="ios-tap-active cool-btn px-2.5 py-1 rounded-full text-slate-600 truncate shrink-0 cursor-pointer"
        >
          &quot;Magic Sarap buy 4 sell 6 (no stock)&quot;
        </button>
      </div>

      {/* Natural Language Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="mt-2.5 flex items-center gap-2"
      >
        <input
          type="text"
          placeholder="Type here: e.g. 'Nova buy 15 sell 20 stock 12, Piattos buy 16 sell 22 stock 10'..."
          value={inputPrompt}
          onChange={(e) => setInputPrompt(e.target.value)}
          disabled={loading}
          className="flex-1 bg-[#f8fafc] border border-slate-200 rounded-full px-4 py-2.5 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all"
        />
        <button
          type="submit"
          disabled={loading || !inputPrompt.trim()}
          className="ios-tap-active w-10 h-10 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-full flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-xs"
          title="Send to AI Assistant"
        >
          <Send className="w-4 h-4 stroke-[2.2]" />
        </button>
      </form>
    </div>
  );
}
