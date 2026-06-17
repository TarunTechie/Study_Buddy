'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { marked } from 'marked';
import { backendApi } from './services/backendApi';
import './styles/markdown.css'
// ── Types ──────────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  question: string;
  steps: string[];
  answer: string | null;
  isLoading: boolean;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const WS_BASE = 'ws://localhost:8000/ws/msg';

// ── Markdown renderer (sync) ───────────────────────────────────────────────────

function renderMd(content: string): { __html: string } {
  const result = marked.parse(content);
  return { __html: typeof result === 'string' ? result : content };
}

// ── ThinkingSteps ──────────────────────────────────────────────────────────────

function ThinkingSteps({ steps, isLoading }: { steps: string[]; isLoading: boolean }) {
  const [open, setOpen] = useState(true);

  // Auto-collapse 1.5 s after response finishes
  useEffect(() => {
    if (!isLoading) {
      const t = setTimeout(() => setOpen(false), 1500);
      return () => clearTimeout(t);
    }
  }, [isLoading]);

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: '#080812', border: '1px solid #1C1C3A' }}>
      {/* Header row */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-white/5"
      >
        {isLoading ? (
          <span className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="block w-1.5 h-1.5 rounded-full bg-[#7C6EEA] animate-bounce"
                style={{ animationDelay: `${i * 120}ms` }}
              />
            ))}
          </span>
        ) : (
          <span style={{ color: '#4ECCA3', fontSize: '12px', lineHeight: 1 }}>✓</span>
        )}

        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '11px',
            color: '#8B82C4',
          }}
        >
          {isLoading
            ? `thinking${steps.length > 0 ? ` · ${steps.length} step${steps.length !== 1 ? 's' : ''}` : '…'}`
            : `done · ${steps.length} reasoning step${steps.length !== 1 ? 's' : ''}`}
        </span>

        <span style={{ marginLeft: 'auto', color: '#3D3868', fontSize: '10px' }}>
          {open ? '▲' : '▼'}
        </span>
      </button>

      {/* Step list */}
      {open && (
        <div style={{ borderTop: '1px solid #1C1C3A', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {steps.map((step, i) =>
            step ? (
              <div key={i} className="flex gap-3 items-start">
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '10px',
                    color: '#3D3868',
                    paddingTop: '2px',
                    flexShrink: 0,
                    width: '20px',
                  }}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <p
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '11px',
                    color: '#8B82C4',
                    lineHeight: 1.65,
                    margin: 0,
                  }}
                >
                  {step}
                </p>
              </div>
            ) : null
          )}

          {/* Animated cursor at the end while still loading */}
          {isLoading && (
            <div className="flex gap-3 items-center">
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '10px',
                  color: '#3D3868',
                  width: '20px',
                }}
              >
                {String(steps.length + 1).padStart(2, '0')}
              </span>
              <span
                className="inline-block w-2 h-3 rounded-sm animate-pulse"
                style={{ background: '#7C6EEA' }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────────

function EmptyState({ subject }: { subject: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center gap-5 select-none">
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: 18,
          background: 'linear-gradient(135deg, rgba(124,110,234,0.12), rgba(232,176,75,0.12))',
          border: '1px solid #252548',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 30,
          color: '#7C6EEA',
        }}
      >
        ⬡
      </div>
      <div>
        <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: '#8B82C4', margin: '0 0 6px' }}>
          no messages yet
        </p>
        <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#3D3868', margin: 0 }}>
          ask me anything about{' '}
          <span style={{ color: '#E8B04B' }}>{subject || 'your notes'}</span>
        </p>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function StudyChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [subjectOptions, setSubjectOptions] = useState<string[]>([]);
  const [subject, setSubject] = useState<string>('');
  const [input, setInput] = useState('');
  const [isConnected, setIsConnected] = useState(false);

  const socketRef = useRef<WebSocket | null>(null);
  const activeIdRef = useRef<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Derived: are we currently waiting for a response?
  const isWaiting = messages.length > 0 && messages[messages.length - 1].isLoading;
  const canSend = isConnected && input.trim().length > 0 && !isWaiting;

  // Scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── WebSocket ──────────────────────────────────────────────────────────────

  const connectWebSocket = useCallback((targetSubject: string) => {
    if (!targetSubject) return;
    socketRef.current?.close();

    const ws = new WebSocket(`${WS_BASE}?subject=${encodeURIComponent(targetSubject)}`);
    socketRef.current = ws;

    ws.onopen = () => setIsConnected(true);
    ws.onclose = () => setIsConnected(false);
    ws.onerror = () => setIsConnected(false);

    ws.onmessage = (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data) as { type: string; msg: string };
        const msgId = activeIdRef.current;
        if (!msgId) return;

        if (data.type === 'STEP' && data.msg) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === msgId ? { ...m, steps: [...m.steps, data.msg] } : m
            )
          );
        } else if (data.type === 'ANS') {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === msgId ? { ...m, answer: data.msg, isLoading: false } : m
            )
          );
          activeIdRef.current = null;
        }
      } catch {
        // ignore non-JSON frames
      }
    };
  }, []);

  useEffect(() => {
    if (subject) connectWebSocket(subject);
    return () => socketRef.current?.close();
  }, [subject, connectWebSocket]);

  // ── Send ───────────────────────────────────────────────────────────────────

  const sendMessage = () => {
    const trimmed = input.trim();
    if (!trimmed || socketRef.current?.readyState !== WebSocket.OPEN) return;

    const newId = `msg-${Date.now()}`;
    activeIdRef.current = newId;

    setMessages((prev) => [
      ...prev,
      { id: newId, question: trimmed, steps: [], answer: null, isLoading: true },
    ]);

    socketRef.current!.send(trimmed);
    setInput('');

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (canSend) sendMessage();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  };

  // ── Fetch subjects ─────────────────────────────────────────────────────────

  useEffect(() => {
    async function load() {
      try {
        const res = await backendApi.get('/getFolderStructure');
        const keys = Object.keys(res.data) as string[];
        setSubjectOptions(keys);
        if (keys.length > 0) setSubject(keys[0]);
      } catch (err) {
        console.error('Failed to load subjects:', err);
      }
    }
    load();
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      className="flex flex-col h-screen"
      style={{ background: '#0D0D1A', color: '#E8E4FF', fontFamily: "'Inter', sans-serif" }}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header
        className="flex-none flex items-center justify-between px-5 py-3"
        style={{ borderBottom: '1px solid #1C1C3A', background: '#0D0D1A' }}
      >
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 9,
              background: 'rgba(124,110,234,0.15)',
              border: '1px solid rgba(124,110,234,0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#7C6EEA',
              fontSize: 16,
            }}
          >
            ⬡
          </div>
          <div>
            <p
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                letterSpacing: '0.14em',
                color: '#E8B04B',
                textTransform: 'uppercase',
                margin: 0,
                lineHeight: 1.3,
              }}
            >
              StudyMind
            </p>
            <p
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10,
                color: '#3D3868',
                margin: 0,
                lineHeight: 1.3,
              }}
            >
              agentic rag · notes retrieval
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-5">
          {/* Live indicator */}
          <div
            className="flex items-center gap-1.5"
            style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}
          >
            <span
              className={`block w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-red-500'}`}
              style={isConnected ? { boxShadow: '0 0 5px #34D399' } : {}}
            />
            <span style={{ color: isConnected ? '#4ECCA3' : '#F87171' }}>
              {isConnected ? 'live' : 'offline'}
            </span>
          </div>

          {/* Subject selector */}
          <div className="flex items-center gap-2">
            <span
              style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#3D3868' }}
            >
              subject/
            </span>
            <select
              value={subject}
              onChange={(e) => {
                setMessages([]);
                setSubject(e.target.value);
              }}
              disabled={subjectOptions.length === 0}
              style={{
                background: '#13132A',
                border: '1px solid #252548',
                color: '#E8E4FF',
                borderRadius: 8,
                padding: '5px 10px',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                outline: 'none',
                cursor: 'pointer',
                opacity: subjectOptions.length === 0 ? 0.4 : 1,
              }}
            >
              {subjectOptions.length === 0 ? (
                <option>loading…</option>
              ) : (
                subjectOptions.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>
      </header>

      {/* ── Messages ───────────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto px-4 py-6">
        {messages.length === 0 ? (
          <EmptyState subject={subject} />
        ) : (
          <div className="max-w-3xl mx-auto space-y-8">
            {messages.map((msg) => (
              <div key={msg.id} className="space-y-3">
                {/* User question bubble */}
                <div className="flex justify-end">
                  <div
                    className="max-w-xl px-5 py-3 rounded-2xl rounded-tr-sm"
                    style={{
                      background: 'linear-gradient(135deg, #5D50CC, #7C6EEA)',
                      boxShadow: '0 4px 24px rgba(124,110,234,0.22)',
                    }}
                  >
                    <p style={{ fontSize: 14, lineHeight: 1.65, color: '#FFFFFF', margin: 0 }}>
                      {msg.question}
                    </p>
                  </div>
                </div>

                {/* AI response area */}
                <div className="flex justify-start">
                  <div className="w-full space-y-3">
                    {/* Thinking chain */}
                    {(msg.steps.length > 0 || msg.isLoading) && (
                      <ThinkingSteps steps={msg.steps} isLoading={msg.isLoading} />
                    )}

                    {/* Final markdown answer */}
                    {msg.answer && (
                      <div
                        className="rounded-2xl rounded-tl-sm px-6 py-5"
                        style={{ background: '#13132A', border: '1px solid #1C1C3A' }}
                      >
                        <div
                          className="study-markdown"
                          dangerouslySetInnerHTML={renderMd(msg.answer)}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </main>

      {/* ── Input bar ──────────────────────────────────────────────────────── */}
      <footer
        className="flex-none px-4 py-4"
        style={{ borderTop: '1px solid #1C1C3A', background: '#0D0D1A' }}
      >
        <div className="max-w-3xl mx-auto">
          <div
            className="flex gap-3 items-end rounded-xl p-2 transition-all duration-150"
            style={{
              background: '#13132A',
              border: `1px solid ${input.trim() ? '#7C6EEA' : '#1C1C3A'}`,
              boxShadow: input.trim() ? '0 0 0 3px rgba(124,110,234,0.1)' : 'none',
            }}
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder={`Ask about ${subject || 'your notes'}…`}
              disabled={!isConnected || isWaiting}
              rows={1}
              style={{
                flex: 1,
                background: 'transparent',
                resize: 'none',
                outline: 'none',
                fontSize: 14,
                lineHeight: 1.55,
                color: '#E8E4FF',
                minHeight: 40,
                maxHeight: 140,
                padding: '8px 12px',
                fontFamily: "'Inter', sans-serif",
                opacity: !isConnected || isWaiting ? 0.4 : 1,
              }}
              className="placeholder-[#3D3868]"
            />
            <button
              onClick={sendMessage}
              disabled={!canSend}
              style={{
                flexShrink: 0,
                alignSelf: 'flex-end',
                width: 40,
                height: 40,
                borderRadius: 10,
                border: 'none',
                background: canSend ? '#7C6EEA' : '#1C1C3A',
                color: canSend ? '#FFFFFF' : '#3D3868',
                cursor: canSend ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.15s, color 0.15s',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>

          <p
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              color: '#252548',
              textAlign: 'center',
              marginTop: 8,
            }}
          >
            ↵ send &nbsp;·&nbsp; shift+↵ newline &nbsp;·&nbsp; powered by your notes
          </p>
        </div>
      </footer>
    </div>
  );
}