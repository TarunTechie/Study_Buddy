'use client';

import { useRef, useState } from 'react';
import { backendApi } from '../services/backendApi';

const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.txt'];
const ACCEPT = ALLOWED_EXTENSIONS.join(',');

interface UploadModalProps {
  subject: string;
  onClose: () => void;
  onUploaded: () => void;
}

export default function UploadModal({ subject, onClose, onUploaded }: UploadModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMsg, setStatusMsg] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const valid = files.filter((f) => {
      const ext = '.' + f.name.split('.').pop()?.toLowerCase();
      return ALLOWED_EXTENSIONS.includes(ext);
    });
    setSelectedFiles(valid);
    setStatus('idle');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    const valid = files.filter((f) => {
      const ext = '.' + f.name.split('.').pop()?.toLowerCase();
      return ALLOWED_EXTENSIONS.includes(ext);
    });
    setSelectedFiles(valid);
    setStatus('idle');
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    setUploading(true);
    setStatus('idle');
    try {
      const formData = new FormData();
      selectedFiles.forEach((f) => formData.append('files', f));
      await backendApi.post(`/uploadFiles?subject=${encodeURIComponent(subject)}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setStatus('success');
      setStatusMsg(`${selectedFiles.length} file${selectedFiles.length !== 1 ? 's' : ''} uploaded`);
      setSelectedFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      onUploaded();
      setTimeout(onClose, 1000);
    } catch {
      setStatus('error');
      setStatusMsg('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const removeFile = (idx: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const getFileIcon = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return '📄';
    if (ext === 'doc' || ext === 'docx') return '📝';
    if (ext === 'txt') return '📃';
    return '📁';
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
        zIndex: 200,
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
          display: 'flex',
          flexDirection: 'column',
          gap: 0,
          overflow: 'hidden',
        }}
      >
        {/* Header */}
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
          <div>
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700, color: '#38BDF8', margin: 0, textTransform: 'uppercase' }}>
              Upload Files
            </p>
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#94A3B8', margin: '3px 0 0' }}>
              subject / <span style={{ color: '#F8FAFC', fontWeight: 600 }}>{subject}</span>
            </p>
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

        {/* Drop zone */}
        <div style={{ padding: '22px' }}>
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: '2px dashed rgba(56,189,248,0.4)',
              borderRadius: 12,
              padding: '34px 20px',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s',
              background: 'rgba(56,189,248,0.04)',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.borderColor = '#38BDF8';
              (e.currentTarget as HTMLDivElement).style.background = 'rgba(56,189,248,0.08)';
              (e.currentTarget as HTMLDivElement).style.boxShadow = '0 0 14px rgba(56,189,248,0.2)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(56,189,248,0.4)';
              (e.currentTarget as HTMLDivElement).style.background = 'rgba(56,189,248,0.04)';
              (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
            }}
          >
            <div style={{ fontSize: 34, marginBottom: 10 }}>📂</div>
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

          {/* Selected files list */}
          {selectedFiles.length > 0 && (
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
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
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#60A5FA' }}>
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

          {/* Status message */}
          {status !== 'idle' && (
            <div
              style={{
                marginTop: 12,
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

        {/* Footer actions */}
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
            disabled={selectedFiles.length === 0 || uploading}
            style={{
              background: selectedFiles.length > 0 && !uploading
                ? 'linear-gradient(135deg, #2563EB, #38BDF8)'
                : '#1E2B45',
              border: 'none',
              borderRadius: 9,
              padding: '9px 24px',
              color: selectedFiles.length > 0 && !uploading ? '#FFFFFF' : '#64748B',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              fontWeight: 600,
              cursor: selectedFiles.length > 0 && !uploading ? 'pointer' : 'not-allowed',
              transition: 'all 0.15s',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: selectedFiles.length > 0 && !uploading ? '0 4px 18px rgba(56,189,248,0.45)' : 'none',
            }}
            onMouseEnter={(e) => {
              if (selectedFiles.length > 0 && !uploading) (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1.1)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.filter = 'none';
            }}
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
                uploading…
              </>
            ) : (
              'Upload'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
