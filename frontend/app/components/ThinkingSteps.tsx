'use client';

import { useEffect, useState } from 'react';

interface ThinkingStepsProps {
  steps: string[];
  isLoading: boolean;
}

export default function ThinkingSteps({ steps, isLoading }: ThinkingStepsProps) {
  const [open, setOpen] = useState(true);

  // Auto-collapse 1.5s after response finishes
  useEffect(() => {
    if (!isLoading) {
      const t = setTimeout(() => setOpen(false), 1500);
      return () => clearTimeout(t);
    }
  }, [isLoading]);

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: '#090E1A', border: '1px solid #1E2B45' }}>
      {/* Header row */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-white/5"
      >
        {isLoading ? (
          <span className="flex gap-1.5 items-center">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="block w-2 h-2 rounded-full bg-[#38BDF8] animate-bounce"
                style={{ animationDelay: `${i * 120}ms`, boxShadow: '0 0 6px rgba(56,189,248,0.6)' }}
              />
            ))}
          </span>
        ) : (
          <span style={{ color: '#34D399', fontSize: '13px', lineHeight: 1, fontWeight: 700 }}>✓</span>
        )}

        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '11px',
            color: '#CBD5E1',
            fontWeight: 500,
          }}
        >
          {isLoading
            ? `reasoning${steps.length > 0 ? ` · ${steps.length} step${steps.length !== 1 ? 's' : ''}` : '…'}`
            : `done · ${steps.length} reasoning step${steps.length !== 1 ? 's' : ''}`}
        </span>

        <span style={{ marginLeft: 'auto', color: '#64748B', fontSize: '10px' }}>
          {open ? '▲' : '▼'}
        </span>
      </button>

      {/* Step list */}
      {open && (
        <div style={{ borderTop: '1px solid #1E2B45', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {steps.map((step, i) =>
            step ? (
              <div key={i} className="flex gap-3 items-start">
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '10px',
                    color: '#64748B',
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
                    color: '#CBD5E1',
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
                  color: '#64748B',
                  width: '20px',
                }}
              >
                {String(steps.length + 1).padStart(2, '0')}
              </span>
              <span
                className="inline-block w-2 h-3 rounded-sm animate-pulse"
                style={{ background: '#38BDF8', boxShadow: '0 0 8px #38BDF8' }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
