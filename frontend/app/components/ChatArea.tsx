'use client';

import { marked } from 'marked';
import ThinkingSteps from './ThinkingSteps';

interface ChatMessage {
  id: string;
  question: string;
  steps: string[];
  answer: string | null;
  isLoading: boolean;
}

function renderMd(content: string): { __html: string } {
  const result = marked.parse(content);
  return { __html: typeof result === 'string' ? result : content };
}

function EmptyState({ subject }: { subject: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center gap-5 select-none py-12">
      <div
        style={{
          width: 76,
          height: 76,
          borderRadius: 20,
          background: 'linear-gradient(135deg, rgba(37,99,235,0.2), rgba(56,189,248,0.15))',
          border: '1px solid rgba(56,189,248,0.45)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 32,
          color: '#38BDF8',
          boxShadow: '0 0 25px rgba(56,189,248,0.25)',
        }}
      >
        ⬡
      </div>
      <div>
        <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 600, color: '#F1F5F9', margin: '0 0 6px' }}>
          no messages yet
        </p>
        <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: '#94A3B8', margin: 0 }}>
          ask me anything about{' '}
          <span style={{ color: '#38BDF8', fontWeight: 600 }}>{subject || 'your notes'}</span>
        </p>
      </div>
    </div>
  );
}

interface ChatAreaProps {
  messages: ChatMessage[];
  subject: string;
  bottomRef: React.RefObject<HTMLDivElement>;
}

export default function ChatArea({ messages, subject, bottomRef }: ChatAreaProps) {
  return (
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
                    background: 'linear-gradient(135deg, #1D4ED8 0%, #0284C7 100%)',
                    boxShadow: '0 4px 22px rgba(56, 189, 248, 0.3)',
                  }}
                >
                  <p style={{ fontSize: 14, lineHeight: 1.65, color: '#FFFFFF', margin: 0, fontWeight: 500 }}>
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
                      style={{
                        background: '#111C35',
                        border: '1px solid #1E2B45',
                        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.25)',
                      }}
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
  );
}
