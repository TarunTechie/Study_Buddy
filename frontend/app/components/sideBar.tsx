'use client';

import { useState } from 'react';
import SubjectModal from './SubjectModal';
import AddSubjectModal from './AddSubjectModal';

interface SidebarProps {
  subjects: string[];
  activeSubject: string;
  onSelectSubject: (subject: string) => void;
  onSubjectsChange: () => void;
}

function getSubjectIcon(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('math') || lower.includes('calc')) return '∑';
  if (lower.includes('phys')) return '⚛';
  if (lower.includes('chem')) return '⚗';
  if (lower.includes('hist')) return '📜';
  if (lower.includes('cs') || lower.includes('code') || lower.includes('prog')) return '⌨';
  if (lower.includes('lang') || lower.includes('english')) return '✍';
  if (lower.includes('bio')) return '🧬';
  return '⬡';
}

/** Three-dot vertical menu icon */
function DotsIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="currentColor"
    >
      <circle cx="8" cy="3" r="1.4" />
      <circle cx="8" cy="8" r="1.4" />
      <circle cx="8" cy="13" r="1.4" />
    </svg>
  );
}

function SubjectRow({
  s,
  isActive,
  onSelect,
  onOpenFiles,
}: {
  s: string;
  isActive: boolean;
  onSelect: () => void;
  onOpenFiles: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        marginBottom: 3,
      }}
    >
      {/* Main row — clicking switches chat */}
      <button
        id={`subject-btn-${s}`}
        onClick={onSelect}
        title={s}
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '9px 10px',
          paddingRight: hovered ? 36 : 10, // make room for dots button
          borderRadius: 9,
          border: isActive ? '1px solid rgba(56, 189, 248, 0.35)' : '1px solid transparent',
          background: isActive
            ? 'linear-gradient(135deg, rgba(37, 99, 235, 0.28), rgba(56, 189, 248, 0.12))'
            : hovered
            ? 'rgba(56, 189, 248, 0.08)'
            : 'transparent',
          cursor: 'pointer',
          textAlign: 'left',
          transition: 'all 0.12s',
          position: 'relative',
          minWidth: 0,
        }}
      >
        {/* Active bar */}
        {isActive && (
          <span
            style={{
              position: 'absolute',
              left: 0,
              top: '20%',
              height: '60%',
              width: 3,
              borderRadius: 3,
              background: '#38BDF8',
              boxShadow: '0 0 8px #38BDF8',
            }}
          />
        )}

        {/* Icon chip */}
        <span
          style={{
            width: 26,
            height: 26,
            borderRadius: 7,
            background: isActive ? 'rgba(56, 189, 248, 0.22)' : 'rgba(56, 189, 248, 0.08)',
            border: `1px solid ${isActive ? 'rgba(56, 189, 248, 0.5)' : '#1E2B45'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            color: isActive ? '#38BDF8' : '#60A5FA',
            flexShrink: 0,
          }}
        >
          {getSubjectIcon(s)}
        </span>

        {/* Name */}
        <span
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 13,
            fontWeight: isActive ? 600 : 500,
            color: isActive ? '#FFFFFF' : hovered ? '#F1F5F9' : '#CBD5E1',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {s}
        </span>
      </button>

      {/* Dots menu button — appears on hover, opens file modal */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onOpenFiles();
        }}
        title="Manage files"
        style={{
          position: 'absolute',
          right: 6,
          top: '50%',
          transform: 'translateY(-50%)',
          opacity: hovered ? 1 : 0,
          pointerEvents: hovered ? 'auto' : 'none',
          transition: 'opacity 0.12s',
          background: 'rgba(56, 189, 248, 0.16)',
          border: '1px solid rgba(56, 189, 248, 0.35)',
          borderRadius: 6,
          width: 24,
          height: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: '#38BDF8',
          flexShrink: 0,
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(56, 189, 248, 0.32)';
          (e.currentTarget as HTMLButtonElement).style.color = '#FFFFFF';
          (e.currentTarget as HTMLButtonElement).style.borderColor = '#38BDF8';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(56, 189, 248, 0.16)';
          (e.currentTarget as HTMLButtonElement).style.color = '#38BDF8';
          (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(56, 189, 248, 0.35)';
        }}
      >
        <DotsIcon />
      </button>
    </div>
  );
}

export default function Sidebar({ subjects, activeSubject, onSelectSubject, onSubjectsChange }: SidebarProps) {
  const [modalSubject, setModalSubject] = useState<string | null>(null);
  const [showAddSubject, setShowAddSubject] = useState(false);

  return (
    <>
      <aside
        style={{
          width: 224,
          flexShrink: 0,
          background: '#060A13',
          borderRight: '1px solid #1E2B45',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
        }}
      >
        {/* Brand */}
        <div
          style={{
            padding: '18px 16px 14px',
            borderBottom: '1px solid #1E2B45',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'rgba(56, 189, 248, 0.15)',
              border: '1px solid rgba(56, 189, 248, 0.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#38BDF8',
              fontSize: 15,
              flexShrink: 0,
              boxShadow: '0 0 10px rgba(56, 189, 248, 0.25)',
            }}
          >
            ⬡
          </div>
          <div>
            <p
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                letterSpacing: '0.12em',
                color: '#38BDF8',
                textTransform: 'uppercase',
                fontWeight: 700,
                margin: 0,
                lineHeight: 1.3,
              }}
            >
              StudyMind
            </p>
            <p
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 9,
                color: '#94A3B8',
                margin: 0,
                lineHeight: 1.3,
              }}
            >
              agentic rag · notes
            </p>
          </div>
        </div>

        {/* Section label + Add Subject */}
        <div style={{ padding: '14px 10px 8px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              letterSpacing: '0.12em',
              color: '#94A3B8',
              textTransform: 'uppercase',
              fontWeight: 600,
              margin: 0,
            }}
          >
            Subjects
          </p>
          <button
            id="add-subject-btn"
            onClick={() => setShowAddSubject(true)}
            title="Add new subject"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 10px',
              borderRadius: 7,
              border: '1px solid rgba(56, 189, 248, 0.45)',
              background: 'rgba(56, 189, 248, 0.12)',
              cursor: 'pointer',
              color: '#38BDF8',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              fontWeight: 600,
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              const b = e.currentTarget as HTMLButtonElement;
              b.style.borderColor = '#38BDF8';
              b.style.color = '#FFFFFF';
              b.style.background = 'rgba(56, 189, 248, 0.25)';
              b.style.boxShadow = '0 0 10px rgba(56, 189, 248, 0.35)';
            }}
            onMouseLeave={(e) => {
              const b = e.currentTarget as HTMLButtonElement;
              b.style.borderColor = 'rgba(56, 189, 248, 0.45)';
              b.style.color = '#38BDF8';
              b.style.background = 'rgba(56, 189, 248, 0.12)';
              b.style.boxShadow = 'none';
            }}
          >
            <span style={{ fontSize: 13, lineHeight: 1, fontWeight: 700 }}>+</span>
            New
          </button>
        </div>

        {/* Subject list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 8px 8px' }}>
          {subjects.length === 0 ? (
            <div style={{ padding: '16px 8px' }}>
              <p
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11,
                  color: '#64748B',
                  margin: 0,
                }}
              >
                no subjects yet
              </p>
            </div>
          ) : (
            subjects.map((s) => (
              <SubjectRow
                key={s}
                s={s}
                isActive={s === activeSubject}
                onSelect={() => onSelectSubject(s)}
                onOpenFiles={() => setModalSubject(s)}
              />
            ))
          )}
        </div>

        {/* Thin bottom border for visual finish */}
        <div style={{ height: 1, background: '#1E2B45', flexShrink: 0 }} />
      </aside>

      {/* Subject files modal */}
      {modalSubject && (
        <SubjectModal
          subject={modalSubject}
          onClose={() => setModalSubject(null)}
          onSubjectsChange={onSubjectsChange}
        />
      )}

      {/* Add subject modal */}
      {showAddSubject && (
        <AddSubjectModal
          onClose={() => setShowAddSubject(false)}
          onDone={() => {
            onSubjectsChange();
            setShowAddSubject(false);
          }}
        />
      )}
    </>
  );
}
