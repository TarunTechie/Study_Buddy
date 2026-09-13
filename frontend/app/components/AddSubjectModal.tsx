'use client';

import { useRef, useState } from 'react';
import { backendApi } from '../services/backendApi';

const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.txt'];
const ACCEPT = ALLOWED_EXTENSIONS.join(',');

interface AddSubjectModalProps {
  onClose: () => void;
  onDone: () => void; // called after a successful upload so parent can refetch
}

function getFileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return '📄';
  if (ext === 'doc' || ext === 'docx') return '📝';
  if (ext === 'txt') return '📃';
  return '📁';
}

export default function AddSubjectModal({ onClose, onDone }: AddSubjectModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [subjectName, setSubjectName] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMsg, setStatusMsg] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const addFiles = (incoming: File[]) => {
    const valid = incoming.filter((f) => {
      const ext = '.' + f.name.split('.').pop()?.toLowerCase();
      return ALLOWED_EXTENSIONS.includes(ext);
    });
    setSelectedFiles((prev) => {
      const names = new Set(prev.map((f) => f.name));
      return [...prev, ...valid.filter((f) => !names.has(f.name))];
    });
    setStatus('idle');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(e.target.files ?? []));
    // reset so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(Array.from(e.dataTransfer.files));
  };

  const removeFile = (idx: number) =>
    setSelectedFiles((prev) => prev.filter((_, i) => i !== idx));

  const canUpload = subjectName.trim().length > 0 && selectedFiles.length > 0 && !uploading;

  const handleUpload = async () => {
    if (!canUpload) return;
    setUploading(true);
    setStatus('idle');
    try {
      const formData = new FormData();
      selectedFiles.forEach((f) => formData.append('files', f));
      await backendApi.post(
        `/uploadFiles?subject=${encodeURIComponent(subjectName.trim())}`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      setStatus('success');
      setStatusMsg(`Subject "${subjectName.trim()}" created with ${selectedFiles.length} file${selectedFiles.length !== 1 ? 's' : ''}`);
      onDone();
      setTimeout(onClose, 1200); // auto-close after brief success display
    } catch {
      setStatus('error');
      setStatusMsg('Upload failed — please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    /* Backdrop */
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(6px)',
        zIndex: 300,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Panel */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 490,
          maxWidth: '92vw',
          background: '#0D1527',
          border: '1px solid #1E2B45',
          borderRadius: 18,
          boxShadow: '0 32px 80px rgba(0,0,0,0.8), 0 0 35px rgba(56,189,248,0.12)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* ── Header ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '18px 22px',
            borderBottom: '1px solid #1E2B45',
            background: 'linear-gradient(180deg, rgba(56,189,248,0.08) 0%, transparent 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
                fontSize: 16,
                color: '#38BDF8',
                boxShadow: '0 0 10px rgba(56,189,248,0.25)',
              }}
            >
              ✦
            </div>
            <div>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 16, fontWeight: 700, color: '#F8FAFC', margin: 0 }}>
                New Subject
              </p>
              <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#94A3B8', margin: '2px 0 0' }}>
                create a subject and upload files
              </p>
            </div>
          </div>
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

        {/* ── Body ── */}
        <div style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Subject name field */}
          <div>
            <label
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '0.1em',
                color: '#94A3B8',
                textTransform: 'uppercase',
                display: 'block',
                marginBottom: 6,
              }}
            >
              Subject Name
            </label>
            <input
              type="text"
              value={subjectName}
              onChange={(e) => { setSubjectName(e.target.value); setStatus('idle'); }}
              placeholder="e.g. Physics, Data Structures, Economics…"
              autoFocus
              style={{
                width: '100%',
                background: '#111C35',
                border: `1px solid ${subjectName.trim() ? '#38BDF8' : '#1E2B45'}`,
                borderRadius: 10,
                padding: '11px 15px',
                color: '#F1F5F9',
                fontFamily: "'Inter', sans-serif",
                fontSize: 14,
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'all 0.15s',
                boxShadow: subjectName.trim() ? '0 0 0 3px rgba(56,189,248,0.25), 0 0 12px rgba(56,189,248,0.15)' : 'none',
              }}
              onKeyDown={(e) => { if (e.key === 'Enter' && canUpload) handleUpload(); }}
            />
          </div>

          {/* Drop zone */}
          <div>
            <label
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '0.1em',
                color: '#94A3B8',
                textTransform: 'uppercase',
                display: 'block',
                marginBottom: 6,
              }}
            >
              Files
            </label>
            <div
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${isDragging ? '#38BDF8' : 'rgba(56,189,248,0.4)'}`,
                borderRadius: 12,
                padding: '26px 20px',
                textAlign: 'center',
                cursor: 'pointer',
                background: isDragging ? 'rgba(56,189,248,0.12)' : 'rgba(56,189,248,0.04)',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                if (!isDragging) {
                  (e.currentTarget as HTMLDivElement).style.borderColor = '#38BDF8';
                  (e.currentTarget as HTMLDivElement).style.background = 'rgba(56,189,248,0.08)';
                  (e.currentTarget as HTMLDivElement).style.boxShadow = '0 0 14px rgba(56,189,248,0.2)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isDragging) {
                  (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(56,189,248,0.4)';
                  (e.currentTarget as HTMLDivElement).style.background = 'rgba(56,189,248,0.04)';
                  (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                }
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 8 }}>📂</div>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: '#CBD5E1', margin: '0 0 4px' }}>
                Drop files here or <span style={{ color: '#38BDF8', fontWeight: 600 }}>click to browse</span>
              </p>
              <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#94A3B8', margin: 0 }}>
                pdf · doc · docx · txt
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={ACCEPT}
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </div>
          </div>

          {/* Selected files */}
          {selectedFiles.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {selectedFiles.map((f, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    background: '#111C35',
                    border: '1px solid #1E2B45',
                    borderRadius: 9,
                    padding: '8px 14px',
                  }}
                >
                  <span style={{ fontSize: 16 }}>{getFileIcon(f.name)}</span>
                  <span
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: 13,
                      color: '#F1F5F9',
                      flex: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {f.name}
                  </span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#60A5FA', flexShrink: 0 }}>
                    {(f.size / 1024).toFixed(1)} kb
                  </span>
                  <button
                    onClick={() => removeFile(idx)}
                    title="Remove"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#94A3B8',
                      cursor: 'pointer',
                      fontSize: 13,
                      padding: 2,
                      lineHeight: 1,
                      transition: 'color 0.15s',
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#F87171'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#94A3B8'; }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Status feedback */}
          {status !== 'idle' && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 8,
                background: status === 'success' ? 'rgba(52,211,153,0.12)' : 'rgba(248,113,113,0.12)',
                border: `1px solid ${status === 'success' ? 'rgba(52,211,153,0.35)' : 'rgba(248,113,113,0.35)'}`,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                color: status === 'success' ? '#34D399' : '#F87171',
                fontWeight: 600,
              }}
            >
              {statusMsg}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div
          style={{
            padding: '16px 22px',
            borderTop: '1px solid #1E2B45',
            display: 'flex',
            gap: 10,
            justifyContent: 'flex-end',
          }}
        >
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: '1px solid #1E2B45',
              borderRadius: 9,
              padding: '8px 18px',
              color: '#94A3B8',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = '#FFFFFF';
              (e.currentTarget as HTMLButtonElement).style.borderColor = '#38BDF8';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = '#94A3B8';
              (e.currentTarget as HTMLButtonElement).style.borderColor = '#1E2B45';
            }}
          >
            cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!canUpload}
            style={{
              background: canUpload
                ? 'linear-gradient(135deg, #2563EB, #38BDF8)'
                : '#1E2B45',
              border: 'none',
              borderRadius: 9,
              padding: '9px 24px',
              color: canUpload ? '#FFFFFF' : '#64748B',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              fontWeight: 600,
              cursor: canUpload ? 'pointer' : 'not-allowed',
              transition: 'all 0.15s',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: canUpload ? '0 4px 18px rgba(56,189,248,0.45)' : 'none',
            }}
            onMouseEnter={(e) => { if (canUpload) (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1.1)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.filter = 'none'; }}
          >
            {uploading ? (
              <>
                <span
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: '#fff',
                    display: 'inline-block',
                    animation: 'spin 0.7s linear infinite',
                  }}
                />
                creating…
              </>
            ) : (
              'Create & Upload'
            )}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
