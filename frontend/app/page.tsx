'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { marked } from 'marked';
import { backendApi } from './services/backendApi';
import './styles/markdown.css';

// ── Types ──────────────────────────────────────────────────────────────────────

type StepStatus = 'running' | 'done' | 'error';

interface Step {
  id: string;
  label: string;
  status: StepStatus;
  startedAt: number;
  endedAt?: number;
}

interface ChatMessage {
  id: string;
  question: string;
  steps: Step[];
  answer: string | null;
  phase: 'working' | 'answering' | 'done';
}

// ── Constants ──────────────────────────────────────────────────────────────────

const WS_BASE = 'ws://localhost:8000/ws/msg';
const STEP_WINDOW = 3;

// ── Helpers ────────────────────────────────────────────────────────────────────

function renderMd(content: string | unknown[]): { __html: string } {
  const text = Array.isArray(content)
    ? content.map((part: any) => (typeof part === 'string' ? part : part?.text ?? '')).join('')
    : content;
  const result = marked.parse(text ?? '');
  return { __html: typeof result === 'string' ? result : text };
}

function applyStepEvent(steps: Step[], label: string): Step[] {
  const now = Date.now();
  const closed = steps.map((s) =>
    s.status === 'running' ? { ...s, status: 'done' as const, endedAt: now } : s
  );
  return [
    ...closed,
    {
      id: `${steps.length}-${label}`,
      label,
      status: 'running',
      startedAt: now,
    },
  ];
}

function finishSteps(steps: Step[]): Step[] {
  const now = Date.now();
  return steps.map((s) => (s.status === 'running' ? { ...s, status: 'done' as const, endedAt: now } : s));
}

// ── Icons (inline SVG, 14px, currentColor) ─────────────────────────────────────

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3.5 8.5l3 3 6-6.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CrossIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M4.5 4.5l7 7M11.5 4.5l-7 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowUpIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 13V3M8 3L3.5 7.5M8 3l4.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
      <rect width="12" height="12" rx="2" fill="currentColor" />
    </svg>
  );
}

// ── useElapsed (live seconds counter for running steps) ────────────────────────

function useElapsed(step: Step) {
  const [, tick] = useState(0);
  useEffect(() => {
    if (step.status !== 'running') return;
    const t = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [step.status]);
  const end = step.endedAt ?? Date.now();
  return Math.max(0, Math.round((end - step.startedAt) / 1000));
}

// ── StepRow ────────────────────────────────────────────────────────────────────

function StepRow({ step }: { step: Step }) {
  const secs = useElapsed(step);
  return (
    <li className={`step step--${step.status}`}>
      <span className="step__icon">
        {step.status === 'running' && <span className="spinner" />}
        {step.status === 'done' && <CheckIcon />}
        {step.status === 'error' && <CrossIcon />}
      </span>
      <span className="step__label">
        {step.label}
        {step.status === 'running' && <span className="sr-only"> (in progress)</span>}
      </span>
      {step.status === 'running' && secs >= 2 && <span className="step__time">{secs}s</span>}
    </li>
  );
}

// ── StepTimeline (live: last 3 steps) ──────────────────────────────────────────

function StepTimeline({ steps }: { steps: Step[] }) {
  const hidden = Math.max(0, steps.length - STEP_WINDOW);
  const visible = steps.slice(-STEP_WINDOW);
  return (
    <div className="steps" aria-live="polite">
      {hidden > 0 && (
        <div className="steps__more">
          {hidden} earlier {hidden === 1 ? 'step' : 'steps'}
        </div>
      )}
      <ul className="steps__list" role="list">
        {visible.map((s) => (
          <StepRow key={s.id} step={s} />
        ))}
      </ul>
    </div>
  );
}

// ── StepSummary (collapsed history after the answer) ───────────────────────────

function StepSummary({ steps }: { steps: Step[] }) {
  const [open, setOpen] = useState(false);
  if (steps.length === 0) return null;
  const total = Math.round(
    ((steps.at(-1)?.endedAt ?? Date.now()) - steps[0].startedAt) / 1000
  );
  const failed = steps.some((s) => s.status === 'error');
  return (
    <div className="stepsummary" data-open={open}>
      <button
        type="button"
        className="stepsummary__btn"
        aria-expanded={open}
        aria-controls="step-history"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="stepsummary__icon">{failed ? <CrossIcon /> : <CheckIcon />}</span>
        <span>
          {failed ? 'Finished with errors' : 'Completed'} {steps.length}{' '}
          {steps.length === 1 ? 'step' : 'steps'}
          {total > 0 && <span className="stepsummary__time"> · {total}s</span>}
        </span>
        <span className="stepsummary__chev"><ChevronIcon /></span>
      </button>
      <div className="stepsummary__body" id="step-history">
        <div className="stepsummary__inner">
          <ul className="steps__list" role="list">
            {steps.map((s) => (
              <StepRow key={s.id} step={s} />
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

// ── Composer ───────────────────────────────────────────────────────────────────

interface ComposerProps {
  subjects: string[];
  subject: string;
  onSubjectChange: (s: string) => void;
  online: boolean;
  busy: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
}

function Composer({ subjects, subject, onSubjectChange, online, busy, onSend, onStop }: ComposerProps) {
  const [value, setValue] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = '0px';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  }, [value]);

  const canSend = online && !busy && value.trim().length > 0;

  function submit() {
    if (!canSend) return;
    onSend(value.trim());
    setValue('');
  }

  return (
    <div className="composer-dock">
      <div className="composer" data-offline={!online}>
        <textarea
          ref={ref}
          className="composer__input"
          rows={1}
          value={value}
          placeholder="Ask anything"
          aria-label="Message"
          disabled={!online}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              submit();
            }
          }}
        />
        <div className="composer__bar">
          {subjects.length > 0 && (
            <label className="pill">
              <span className="pill__label">Subject</span>
              <select
                className="pill__select"
                value={subject}
                onChange={(e) => onSubjectChange(e.target.value)}
                aria-label="Subject"
              >
                {subjects.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <svg className="pill__chev" width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </label>
          )}

          <span className="status" role="status">
            <span className={`status__dot ${online ? 'is-online' : 'is-offline'}`} aria-hidden="true" />
            {online ? 'Online' : 'Offline'}
          </span>

          <span className="composer__spacer" />

          {!online && (
            <span className="offline-notice">Reconnecting…</span>
          )}

          {busy ? (
            <button type="button" className="send send--stop" onClick={onStop} aria-label="Stop generating">
              <StopIcon />
            </button>
          ) : (
            <button type="button" className="send" onClick={submit} disabled={!canSend} aria-label="Send message">
              <ArrowUpIcon />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────────

function EmptyState({ subject, onSuggestion }: { subject: string; onSuggestion: (q: string) => void }) {
  const suggestions = [
    `Summarize ${subject || 'my notes'}`,
    'Explain the key concepts',
    'Quiz me on this topic',
  ];
  return (
    <div className="empty-state">
      <p className="empty-state__title">What would you like to know?</p>
      <p className="empty-state__hint">
        Ask anything about {subject || 'your notes'}
      </p>
      <div className="empty-state__chips">
        {suggestions.map((s) => (
          <button key={s} className="empty-state__chip" onClick={() => onSuggestion(s)}>
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function StudyChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [subjectOptions, setSubjectOptions] = useState<string[]>([]);
  const [subject, setSubject] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);

  const socketRef = useRef<WebSocket | null>(null);
  const activeIdRef = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [showJump, setShowJump] = useState(false);

  // Derived state
  const isWaiting = messages.length > 0 && messages[messages.length - 1].phase === 'working';

  // ── Autoscroll ──────────────────────────────────────────────────────────────

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (isNearBottom) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Track scroll position for "jump to latest"
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    function onScroll() {
      const gap = el!.scrollHeight - el!.scrollTop - el!.clientHeight;
      setShowJump(gap > 200);
    }
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  function jumpToBottom() {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  // ── WebSocket ───────────────────────────────────────────────────────────────

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
              m.id === msgId
                ? { ...m, steps: applyStepEvent(m.steps, data.msg) }
                : m
            )
          );
        } else if (data.type === 'ANS') {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === msgId
                ? { ...m, steps: finishSteps(m.steps), answer: data.msg, phase: 'done' }
                : m
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

  // ── Send ────────────────────────────────────────────────────────────────────

  const sendMessage = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed || socketRef.current?.readyState !== WebSocket.OPEN) return;

    const newId = `msg-${Date.now()}`;
    activeIdRef.current = newId;

    setMessages((prev) => [
      ...prev,
      { id: newId, question: trimmed, steps: [], answer: null, phase: 'working' },
    ]);

    socketRef.current!.send(trimmed);
  }, []);

  const handleStop = useCallback(() => {
    // Close and reconnect to stop generation
    socketRef.current?.close();
    if (activeIdRef.current) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === activeIdRef.current
            ? { ...m, steps: finishSteps(m.steps), phase: 'done' }
            : m
        )
      );
      activeIdRef.current = null;
    }
    if (subject) connectWebSocket(subject);
  }, [subject, connectWebSocket]);

  const handleSubjectChange = useCallback((newSubject: string) => {
    setMessages([]);
    setSubject(newSubject);
  }, []);

  // ── Fetch subjects ──────────────────────────────────────────────────────────

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

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="chat-page">
      {/* Header — minimal */}
      <header className="chat-header">
        <span className="chat-header__brand">StudyMind</span>
      </header>

      {/* Messages */}
      <main className="chat-scroll" ref={scrollRef}>
        {messages.length === 0 ? (
          <EmptyState subject={subject} onSuggestion={sendMessage} />
        ) : (
          <div className="chat-column">
            {messages.map((msg) => (
              <div key={msg.id} className="msg-pair">
                {/* User message */}
                <div className="msg-user">
                  <div className="msg-user__bubble">{msg.question}</div>
                </div>

                {/* Assistant message */}
                <div className="msg-assistant">
                  {/* Live step timeline while working */}
                  {msg.phase === 'working' && <StepTimeline steps={msg.steps} />}

                  {/* Collapsed step summary after answer */}
                  {msg.phase !== 'working' && msg.steps.length > 0 && (
                    <StepSummary steps={msg.steps} />
                  )}

                  {/* Markdown answer */}
                  {msg.answer && (
                    <div
                      className="markdown"
                      dangerouslySetInnerHTML={renderMd(msg.answer)}
                    />
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </main>

      {/* Jump to bottom */}
      {showJump && messages.length > 0 && (
        <button className="jump-bottom" onClick={jumpToBottom}>
          ↓ Jump to latest
        </button>
      )}

      {/* Composer */}
      <Composer
        subjects={subjectOptions}
        subject={subject}
        onSubjectChange={handleSubjectChange}
        online={isConnected}
        busy={isWaiting}
        onSend={sendMessage}
        onStop={handleStop}
      />
    </div>
  );
}