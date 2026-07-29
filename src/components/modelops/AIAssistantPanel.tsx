'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Bot, ChevronDown, ChevronUp, Loader2, SendHorizonal, Sparkles, Wand2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AssistantMessage {
  role: 'user' | 'assistant';
  content: string;
  suggestions?: AssistantSuggestion[];
}

export interface AssistantSuggestion {
  id: string;
  title: string;
  detail: string;
  field: string;
  value: string;
  confidence: number;
}

interface AIAssistantPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  mode: 'form' | 'card';
  context: Record<string, unknown>;
  messages: AssistantMessage[];
  onMessagesChange: (messages: AssistantMessage[]) => void;
  onApplySuggestion: (field: string, value: string, title: string) => void;
  placeholder?: string;
}

export function AIAssistantPanel({
  isOpen,
  onToggle,
  mode,
  context,
  messages,
  onMessagesChange,
  onApplySuggestion,
  placeholder,
}: AIAssistantPanelProps) {
  const [draftInput, setDraftInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [autoPrompted, setAutoPrompted] = useState(false);

  const title = mode === 'card' ? 'Model Card Copilot' : 'Form Copilot';
  const hint = useMemo(() => (
    mode === 'card'
      ? 'Review the generated model card and apply the most valuable improvements with one click.'
      : 'Ask for field-level guidance, missing evidence, or a stronger governance narrative.'
  ), [mode]);

  const appendMessage = useCallback((message: AssistantMessage) => {
    onMessagesChange([...messages, message]);
  }, [messages, onMessagesChange]);

  const sendPrompt = useCallback(async (promptText: string) => {
    if (!promptText.trim() || isThinking) {
      return;
    }

    const userMessage = { role: 'user' as const, content: promptText };
    appendMessage(userMessage);
    setIsThinking(true);

    try {
      const response = await fetch('/api/modelops/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          context,
          history: [...messages, userMessage],
        }),
      });

      const data = await response.json();
      const assistantMessage = {
        role: 'assistant' as const,
        content: data.message || 'I reviewed the context and I’m ready to help.',
        suggestions: data.suggestions || [],
      };

      const streamText = (text: string) => {
        let rendered = '';
        const step = () => {
          rendered += text[rendered.length] ?? '';
          onMessagesChange([...messages, userMessage, { ...assistantMessage, content: rendered }]);
          if (rendered.length < text.length) {
            window.setTimeout(step, 18);
          } else {
            setIsThinking(false);
          }
        };
        step();
      };

      streamText(assistantMessage.content);
    } catch {
      const fallbackMessage = {
        role: 'assistant' as const,
        content: 'I’m available to help tighten the narrative, improve evidence, and suggest better next steps.',
        suggestions: [],
      };
      onMessagesChange([...messages, userMessage, fallbackMessage]);
      setIsThinking(false);
    }
  }, [appendMessage, context, isThinking, messages, mode, onMessagesChange]);

  useEffect(() => {
    if (!isOpen || autoPrompted) {
      return;
    }

    setAutoPrompted(true);
    void sendPrompt('Review the current context and propose the highest-value improvement.');
  }, [autoPrompted, isOpen, sendPrompt]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = draftInput.trim();
    if (!trimmed) {
      return;
    }
    setDraftInput('');
    await sendPrompt(trimmed);
  };

  return (
    <div className="w-[min(100%,24rem)] rounded-2xl border border-neutral-800 bg-neutral-950/95 shadow-2xl shadow-black/40 backdrop-blur">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 rounded-t-2xl border-b border-neutral-800 bg-neutral-900/80 px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <div className="rounded-full border border-blue-500/30 bg-blue-500/10 p-2 text-blue-300">
            <Bot className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{title}</p>
            <p className="text-xs text-neutral-400">{hint}</p>
          </div>
        </div>
        {isOpen ? <ChevronDown className="h-4 w-4 text-neutral-400" /> : <ChevronUp className="h-4 w-4 text-neutral-400" />}
      </button>

      {isOpen ? (
        <div className="flex max-h-[70vh] flex-col">
          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={cn('rounded-xl border px-3 py-3 text-sm', message.role === 'assistant' ? 'border-neutral-800 bg-neutral-900/70 text-neutral-200' : 'border-blue-500/20 bg-blue-500/10 text-blue-50')}>
                <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-neutral-400">
                  {message.role === 'assistant' ? <Sparkles className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                  {message.role === 'assistant' ? 'Assistant' : 'You'}
                </div>
                <p className="whitespace-pre-wrap leading-6">{message.content}</p>
                {message.suggestions && message.suggestions.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    {message.suggestions.map((suggestion) => (
                      <div key={suggestion.id} className="rounded-lg border border-neutral-700 bg-neutral-950/70 p-3">
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium text-white">{suggestion.title}</p>
                            <p className="text-xs text-neutral-400">{suggestion.detail}</p>
                          </div>
                          <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-300">
                            {Math.round(suggestion.confidence * 100)}%
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => onApplySuggestion(suggestion.field, suggestion.value, suggestion.title)}
                          className="inline-flex items-center gap-2 rounded-lg border border-neutral-700 bg-neutral-800 px-2.5 py-1.5 text-xs font-medium text-neutral-200 transition hover:bg-neutral-700"
                        >
                          <Wand2 className="h-3.5 w-3.5" /> Apply
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
            {isThinking ? (
              <div className="rounded-xl border border-neutral-800 bg-neutral-900/70 px-3 py-3 text-sm text-neutral-300">
                <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-neutral-400">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Assistant is thinking
                </div>
                <p>Reviewing the context and preparing the next best step.</p>
              </div>
            ) : null}
          </div>

          <form onSubmit={handleSubmit} className="border-t border-neutral-800 bg-neutral-900/80 p-3">
            <label className="sr-only" htmlFor="assistant-input">Assistant prompt</label>
            <div className="flex items-center gap-2 rounded-xl border border-neutral-700 bg-neutral-950 px-3 py-2">
              <input
                id="assistant-input"
                value={draftInput}
                onChange={(event) => setDraftInput(event.target.value)}
                placeholder={placeholder || 'Ask the assistant for guidance...'}
                className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-neutral-500"
              />
              <button type="submit" className="rounded-lg bg-blue-600 p-2 text-white transition hover:bg-blue-500">
                <SendHorizonal className="h-4 w-4" />
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
