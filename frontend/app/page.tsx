'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { backendApi } from './services/backendApi';
import './styles/markdown.css';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';

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

// ── Main component ─────────────────────────────────────────────────────────────

export default function StudyChat() {
  // Per-subject message history
  const [chatHistory, setChatHistory] = useState<Record<string, ChatMessage[]>>({});
  const [subjectOptions, setSubjectOptions] = useState<string[]>([]);
  const [subject, setSubject] = useState<string>('');
  const [input, setInput] = useState('');
  const [isConnected, setIsConnected] = useState(false);

  const socketRef = useRef<WebSocket | null>(null);
  const activeIdRef = useRef<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null!);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Current subject's messages
  const messages: ChatMessage[] = chatHistory[subject] ?? [];
  const isWaiting = messages.length > 0 && messages[messages.length - 1].isLoading;
  const canSend = isConnected && input.trim().length > 0 && !isWaiting;

  // Scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, subject]);

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
          setChatHistory((prev) => {
            const subjectMsgs = prev[targetSubject] ?? [];
            return {
              ...prev,
              [targetSubject]: subjectMsgs.map((m) =>
                m.id === msgId ? { ...m, steps: [...m.steps, data.msg] } : m
              ),
            };
          });
        } else if (data.type === 'ANS') {
          setChatHistory((prev) => {
            const subjectMsgs = prev[targetSubject] ?? [];
            return {
              ...prev,
              [targetSubject]: subjectMsgs.map((m) =>
                m.id === msgId ? { ...m, answer: data.msg, isLoading: false } : m
              ),
            };
          });
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

    setChatHistory((prev) => ({
      ...prev,
      [subject]: [
        ...(prev[subject] ?? []),
        { id: newId, question: trimmed, steps: [], answer: null, isLoading: true },
      ],
    }));

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

  const loadSubjects = useCallback(async () => {
    try {
      const res = await backendApi.get('/getFolderStructure');
      const keys = Object.keys(res.data) as string[];
      setSubjectOptions(keys);
      if (keys.length > 0 && !subject) setSubject(keys[0]);
    } catch (err) {
      console.error('Failed to load subjects:', err);
    }
  }, [subject]);

  useEffect(() => {
    loadSubjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      className="flex h-screen"
      style={{ background: '#0A0F1D', color: '#F1F5F9', fontFamily: "'Inter', sans-serif" }}
    >
      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <Sidebar
        subjects={subjectOptions}
        activeSubject={subject}
        onSelectSubject={(s) => setSubject(s)}
        onSubjectsChange={loadSubjects}
      />

      {/* ── Chat pane ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <header
          className="flex-none flex items-center justify-between px-5 py-3"
          style={{ borderBottom: '1px solid #1E2B45', background: '#0A0F1D' }}
        >
          {/* Active subject pill */}
          <div className="flex items-center gap-3">
            {subject ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  background: 'rgba(56, 189, 248, 0.12)',
                  border: '1px solid rgba(56, 189, 248, 0.4)',
                  borderRadius: 8,
                  padding: '5px 14px',
                  boxShadow: '0 0 12px rgba(56, 189, 248, 0.15)',
                }}
              >
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#94A3B8' }}>
                  subject/
                </span>
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 12,
                    color: '#38BDF8',
                    fontWeight: 700,
                  }}
                >
                  {subject}
                </span>
              </div>
            ) : (
              <span
                style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#64748B' }}
              >
                select a subject from the sidebar
              </span>
            )}
          </div>

          {/* Live indicator */}
          <div
            className="flex items-center gap-2"
            style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}
          >
            <span
              className={`block w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-red-500'}`}
              style={isConnected ? { boxShadow: '0 0 8px #34D399' } : {}}
            />
            <span style={{ color: isConnected ? '#34D399' : '#F87171', fontWeight: 600 }}>
              {isConnected ? 'LIVE' : 'OFFLINE'}
            </span>
          </div>
        </header>

        {/* Messages */}
        <ChatArea messages={messages} subject={subject} bottomRef={bottomRef} />

        {/* Input bar */}
        <footer
          className="flex-none px-4 py-4"
          style={{ borderTop: '1px solid #1E2B45', background: '#0A0F1D' }}
        >
          <div className="max-w-3xl mx-auto">
            <div
              className="flex gap-3 items-end rounded-xl p-2 transition-all duration-150"
              style={{
                background: '#111C35',
                border: `1px solid ${input.trim() ? '#38BDF8' : '#1E2B45'}`,
                boxShadow: input.trim() ? '0 0 0 3px rgba(56, 189, 248, 0.25), 0 0 15px rgba(56, 189, 248, 0.2)' : 'none',
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
                  color: '#F1F5F9',
                  minHeight: 40,
                  maxHeight: 140,
                  padding: '8px 12px',
                  fontFamily: "'Inter', sans-serif",
                  opacity: !isConnected || isWaiting ? 0.4 : 1,
                }}
                className="placeholder-[#64748B]"
              />
              <button
                onClick={sendMessage}
                disabled={!canSend}
                title="Send message"
                style={{
                  flexShrink: 0,
                  alignSelf: 'flex-end',
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  border: 'none',
                  background: canSend ? 'linear-gradient(135deg, #2563EB, #38BDF8)' : '#1E2B45',
                  color: canSend ? '#FFFFFF' : '#64748B',
                  cursor: canSend ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s',
                  boxShadow: canSend ? '0 0 14px rgba(56, 189, 248, 0.45)' : 'none',
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>

            <p
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10,
                color: '#64748B',
                textAlign: 'center',
                marginTop: 8,
              }}
            >
              ↵ send &nbsp;·&nbsp; shift+↵ newline &nbsp;·&nbsp; powered by your notes
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}