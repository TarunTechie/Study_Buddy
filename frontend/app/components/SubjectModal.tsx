'use client';

import { useEffect, useRef, useState } from 'react';
import { backendApi } from '../services/backendApi';
import UploadModal from './UploadModal';

interface SubjectModalProps {
  subject: string;
  onClose: () => void;
  onSubjectsChange: () => void;
}

const FILE_ICONS: Record<string, string> = {
  pdf: '📄',
  doc: '📝',
  docx: '📝',
  txt: '📃',
};

type LearnStatus = 'idle' | 'running' | 'done' | 'error';

export default function SubjectModal({ subject, onClose, onSubjectsChange }: SubjectModalProps) {
  const [files, setFiles] = useState<string[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [showUpload, setShowUpload] = useState(false);

  // Learn / embed state
  const [learnStatus, setLearnStatus] = useState<LearnStatus>('idle');
  const [learnSteps, setLearnSteps] = useState<string[]>([]);
  const eventSourceRef = useRef<EventSource | null>(null);

  const fetchFiles = async () => {
    setLoadingFiles(true);
    try {
      const res = await backendApi.get('/getFolderStructure');
      const structure = res.data as Record<string, string[]>;
      setFiles(structure[subject] ?? []);
    } catch {
      setFiles([]);
    } finally {
      setLoadingFiles(false);
    }
  };

  useEffect(() => {
    fetchFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject]);

  // Clean up SSE on unmount
  useEffect(() => {
    return () => {
      eventSourceRef.current?.close();
    };
  }, []);

  const handleUploaded = () => {
    fetchFiles();
    onSubjectsChange();
  };

  // ── Learn / embed ──────────────────────────────────────────────────────────

  const handleLearn = () => {
    if (learnStatus === 'running') return;

    setLearnStatus('running');
    setLearnSteps([]);

    const url = `http://localhost:8000/embed?subject=${encodeURIComponent(subject)}`;
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onmessage = (e: MessageEvent) => {
      const msg: string = e.data;
      if (msg === 'Completed the Process') {
        setLearnStatus('done');
        es.close();
      } else {
        // De-duplicate consecutive identical steps (backend yields same msg while waiting)
        setLearnSteps((prev) => {
          if (prev.length > 0 && prev[prev.length - 1] === msg) return prev;
          return [...prev, msg];
        });
      }
    };

    es.onerror = () => {
      setLearnStatus('error');
      setLearnSteps((prev) => [...prev, 'Connection error — please try again.']);
      es.close();
    };
  };

  const resetLearn = () => {
    eventSourceRef.current?.close();
    setLearnStatus('idle');
    setLearnSteps([]);
  };

  // ──────────────────────────────────────────────────────────────────────────

  const handleDeleteSubject = async () => {
    if (confirm(`Are you sure you want to delete the subject "${subject}"? This will remove all files and embeddings.`)) {
      try {
        await backendApi.delete(`/delete`, { params: { folderName: subject } });
        onSubjectsChange();
        onClose();
      } catch (err) {
        console.error('Failed to delete subject', err);
      }
    }
  };

  const handleDeleteFile = async (fileName: string) => {
    if (confirm(`Are you sure you want to delete "${fileName}"?`)) {
      try {
        await backendApi.delete(`/delete`, { params: { folderName: subject, fileName } });
        fetchFiles();
      } catch (err) {
        console.error('Failed to delete file', err);
      }
    }
  };

  const getFileIcon = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase() ?? '';
    return FILE_ICONS[ext] ?? '📁';
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(6px)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Panel */}
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            width: 530,
            maxWidth: '92vw',
            maxHeight: '80vh',
            background: '#0D1527',
            border: '1px solid #1E2B45',
            borderRadius: 18,
            boxShadow: '0 32px 80px rgba(0,0,0,0.8), 0 0 35px rgba(56,189,248,0.12)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* ── Header ── */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '20px 22px 18px',
              borderBottom: '1px solid #1E2B45',
              background: 'linear-gradient(180deg, rgba(56,189,248,0.08) 0%, transparent 100%)',
            }}
          >
            {/* Title */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 9,
                    background: 'rgba(56,189,248,0.15)',
                    border: '1px solid rgba(56,189,248,0.45)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 15,
                    color: '#38BDF8',
                    boxShadow: '0 0 10px rgba(56,189,248,0.25)',
                  }}
                >
                  ⬡
                </div>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 17, fontWeight: 700, color: '#F8FAFC', margin: 0 }}>
                  {subject}
                </p>
              </div>
              <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#94A3B8', margin: 0 }}>
                {loadingFiles ? 'loading files…' : `${files.length} file${files.length !== 1 ? 's' : ''}`}
              </p>
            </div>

            {/* Action buttons + close */}
            <div style={{ display: 'flex', gap: 9, alignItems: 'center' }}>
              {/* Delete Subject button */}
              <button
                onClick={handleDeleteSubject}
                title="Delete Subject"
                style={{
                  background: 'rgba(239,68,68,0.12)',
                  border: '1px solid rgba(239,68,68,0.45)',
                  borderRadius: 9,
                  padding: '7px 15px',
                  color: '#EF4444',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => {
                  const b = e.currentTarget;
                  b.style.background = 'rgba(239,68,68,0.22)';
                  b.style.borderColor = '#EF4444';
                  b.style.color = '#FFFFFF';
                  b.style.boxShadow = '0 0 12px rgba(239,68,68,0.35)';
                }}
                onMouseLeave={(e) => {
                  const b = e.currentTarget;
                  b.style.background = 'rgba(239,68,68,0.12)';
                  b.style.borderColor = 'rgba(239,68,68,0.45)';
                  b.style.color = '#EF4444';
                  b.style.boxShadow = 'none';
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                Delete
              </button>

              {/* Upload button */}
              <button
                id={`upload-btn-${subject}`}
                onClick={() => setShowUpload(true)}
                disabled={learnStatus === 'running'}
                style={{
                  background: 'rgba(56,189,248,0.12)',
                  border: '1px solid rgba(56,189,248,0.45)',
                  borderRadius: 9,
                  padding: '7px 15px',
                  color: '#38BDF8',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: learnStatus === 'running' ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all 0.15s',
                  opacity: learnStatus === 'running' ? 0.4 : 1,
                }}
                onMouseEnter={(e) => {
                  if (learnStatus !== 'running') {
                    const b = e.currentTarget as HTMLButtonElement;
                    b.style.background = 'rgba(56,189,248,0.22)';
                    b.style.borderColor = '#38BDF8';
                    b.style.color = '#FFFFFF';
                    b.style.boxShadow = '0 0 12px rgba(56,189,248,0.35)';
                  }
                }}
                onMouseLeave={(e) => {
                  const b = e.currentTarget as HTMLButtonElement;
                  b.style.background = 'rgba(56,189,248,0.12)';
                  b.style.borderColor = 'rgba(56,189,248,0.45)';
                  b.style.color = '#38BDF8';
                  b.style.boxShadow = 'none';
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                Upload
              </button>

              {/* Learn button */}
              <button
                id={`learn-btn-${subject}`}
                onClick={learnStatus === 'idle' || learnStatus === 'error' ? handleLearn : learnStatus === 'done' ? resetLearn : undefined}
                disabled={learnStatus === 'running'}
                style={{
                  background:
                    learnStatus === 'done'
                      ? 'linear-gradient(135deg, #059669, #10B981)'
                      : learnStatus === 'error'
                      ? 'linear-gradient(135deg, #DC2626, #EF4444)'
                      : 'linear-gradient(135deg, #0284C7, #38BDF8)',
                  border: 'none',
                  borderRadius: 9,
                  padding: '7px 16px',
                  color: '#FFFFFF',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: learnStatus === 'running' ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow:
                    learnStatus === 'done'
                      ? '0 4px 16px rgba(16,185,129,0.4)'
                      : learnStatus === 'error'
                      ? '0 4px 16px rgba(239,68,68,0.4)'
                      : '0 4px 18px rgba(56,189,248,0.45)',
                  transition: 'all 0.2s',
                  opacity: learnStatus === 'running' ? 0.75 : 1,
                }}
                onMouseEnter={(e) => {
                  if (learnStatus !== 'running') {
                    (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.filter = 'none';
                }}
              >
                {learnStatus === 'running' ? (
                  <>
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        border: '2px solid rgba(255,255,255,0.3)',
                        borderTopColor: '#fff',
                        display: 'inline-block',
                        animation: 'spin 0.7s linear infinite',
                      }}
                    />
                    Learning…
                  </>
                ) : learnStatus === 'done' ? (
                  <>✓ Done</>
                ) : learnStatus === 'error' ? (
                  <>↺ Retry</>
                ) : (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                    </svg>
                    Learn
                  </>
                )}
              </button>

              {/* Close */}
              <button
                onClick={onClose}
                title="Close"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid #1E2B45',
                  borderRadius: 8,
                  width: 32,
                  height: 32,
                  color: '#94A3B8',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 14,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.color = '#FFFFFF';
                  (e.currentTarget as HTMLButtonElement).style.borderColor = '#38BDF8';
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.12)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.color = '#94A3B8';
                  (e.currentTarget as HTMLButtonElement).style.borderColor = '#1E2B45';
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)';
                }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* ── Learn progress panel (shown while learning or done) ── */}
          {(learnStatus === 'running' || learnStatus === 'done' || learnStatus === 'error') && (
            <div
              style={{
                borderBottom: '1px solid #1E2B45',
                padding: '14px 22px',
                background: '#080D19',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <p
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 10,
                  fontWeight: 600,
                  color: learnStatus === 'done' ? '#34D399' : learnStatus === 'error' ? '#F87171' : '#38BDF8',
                  margin: '0 0 6px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                }}
              >
                {learnStatus === 'done' ? '✓ embedding complete' : learnStatus === 'error' ? '✕ error' : '⟳ embedding in progress'}
              </p>
              {learnSteps.map((step, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 10,
                      color: learnStatus === 'done' && i === learnSteps.length - 1 ? '#34D399' : '#64748B',
                      paddingTop: 2,
                      flexShrink: 0,
                      width: 20,
                    }}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 12,
                      color: learnStatus === 'error' && i === learnSteps.length - 1 ? '#F87171' : '#CBD5E1',
                      lineHeight: 1.55,
                    }}
                  >
                    {step}
                  </span>
                </div>
              ))}
              {learnStatus === 'running' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#64748B', width: 20 }}>
                    {String(learnSteps.length + 1).padStart(2, '0')}
                  </span>
                  <span
                    style={{
                      display: 'inline-block',
                      width: 8,
                      height: 14,
                      borderRadius: 2,
                      background: '#38BDF8',
                      boxShadow: '0 0 8px #38BDF8',
                      animation: 'pulse 1s infinite',
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {/* ── File list ── */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 22px' }}>
            {loadingFiles ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    style={{
                      height: 48,
                      borderRadius: 10,
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid #1E2B45',
                    }}
                  />
                ))}
              </div>
            ) : files.length === 0 ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 12,
                  padding: '44px 20px',
                  textAlign: 'center',
                }}
              >
                <span style={{ fontSize: 38, opacity: 0.5 }}>📂</span>
                <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: '#94A3B8', margin: 0 }}>
                  no files yet — upload some to get started
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {files.map((filename, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      background: '#111C35',
                      border: '1px solid #1E2B45',
                      borderRadius: 10,
                      padding: '11px 15px',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(56,189,248,0.45)';
                      (e.currentTarget as HTMLDivElement).style.background = '#142240';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLDivElement).style.borderColor = '#1E2B45';
                      (e.currentTarget as HTMLDivElement).style.background = '#111C35';
                    }}
                  >
                    <span style={{ fontSize: 20, flexShrink: 0 }}>{getFileIcon(filename)}</span>
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <p
                        style={{
                          fontFamily: "'Inter', sans-serif",
                          fontSize: 13,
                          fontWeight: 500,
                          color: '#F1F5F9',
                          margin: 0,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {filename}
                      </p>
                      <p
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 10,
                          color: '#60A5FA',
                          margin: '2px 0 0',
                          textTransform: 'uppercase',
                          fontWeight: 600,
                        }}
                      >
                        {filename.split('.').pop()?.toUpperCase()}
                      </p>
                    </div>
                    {/* Delete file button */}
                    <button
                      onClick={() => handleDeleteFile(filename)}
                      title="Delete File"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#64748B',
                        cursor: 'pointer',
                        padding: 8,
                        borderRadius: 6,
                        transition: 'all 0.15s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = '#EF4444';
                        e.currentTarget.style.background = 'rgba(239,68,68,0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = '#64748B';
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upload modal (stacked on top) */}
      {showUpload && (
        <UploadModal
          subject={subject}
          onClose={() => setShowUpload(false)}
          onUploaded={handleUploaded}
        />
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}
