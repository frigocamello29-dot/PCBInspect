'use client';

import { useRef, useState, DragEvent } from 'react';

interface UploadZoneProps {
  file: File | null;
  previewUrl: string | null;
  disabled: boolean;
  onFile: (file: File) => void;
  onClear: () => void;
  onCameraOpen: () => void;
}

function formatBytes(b: number): string {
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

export default function UploadZone({ file, previewUrl, disabled, onFile, onClear, onCameraOpen }: UploadZoneProps) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    if (!disabled) setDragging(true);
  }
  function handleDragLeave() { setDragging(false); }
  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    const f = e.dataTransfer.files[0];
    if (f) onFile(f);
  }
  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) onFile(f);
    e.target.value = '';
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        minHeight: 280,
        borderRadius: 'var(--radius-lg)',
        border: `${dragging ? '1.5px' : '0.5px'} dashed ${dragging ? 'var(--copper)' : 'var(--bg-border)'}`,
        background: dragging ? 'var(--copper-glow)' : 'var(--bg-surface)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        transition: 'border-color 150ms ease, background 150ms ease',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {file && previewUrl ? (
        <>
          <div style={{ flex: 1, position: 'relative', minHeight: 220 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Preview"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 14px',
            borderTop: '0.5px solid var(--bg-border)',
            background: 'var(--bg-elevated)',
          }}>
            <span style={{
              flex: 1, fontSize: 12, color: 'var(--text-secondary)',
              fontFamily: "'JetBrains Mono', monospace",
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {file.name}
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-dim)', flexShrink: 0 }}>
              {formatBytes(file.size)}
            </span>
            <button
              onClick={onClear}
              disabled={disabled}
              style={{
                background: 'transparent', color: 'var(--text-secondary)',
                border: '0.5px solid var(--bg-border)',
                borderRadius: 'var(--radius-md)',
                padding: '4px 10px', fontSize: 12, cursor: disabled ? 'not-allowed' : 'pointer',
                fontFamily: "'Inter', sans-serif", flexShrink: 0,
              }}
              onMouseEnter={e => { if (!disabled) { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'var(--bg-surface)'; } }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'transparent'; }}
            >
              Clear
            </button>
          </div>
        </>
      ) : (
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: 32, gap: 12, textAlign: 'center',
        }}>
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <rect x="8" y="8" width="32" height="32" rx="4" stroke="var(--text-dim)" strokeWidth="1.5"/>
            <rect x="16" y="16" width="16" height="16" rx="2" stroke="var(--text-dim)" strokeWidth="1.5"/>
            <line x1="8" y1="20" x2="4" y2="20" stroke="var(--text-dim)" strokeWidth="1.5"/>
            <line x1="8" y1="28" x2="4" y2="28" stroke="var(--text-dim)" strokeWidth="1.5"/>
            <line x1="40" y1="20" x2="44" y2="20" stroke="var(--text-dim)" strokeWidth="1.5"/>
            <line x1="40" y1="28" x2="44" y2="28" stroke="var(--text-dim)" strokeWidth="1.5"/>
            <line x1="20" y1="8" x2="20" y2="4" stroke="var(--text-dim)" strokeWidth="1.5"/>
            <line x1="28" y1="8" x2="28" y2="4" stroke="var(--text-dim)" strokeWidth="1.5"/>
            <line x1="20" y1="40" x2="20" y2="44" stroke="var(--text-dim)" strokeWidth="1.5"/>
            <line x1="28" y1="40" x2="28" y2="44" stroke="var(--text-dim)" strokeWidth="1.5"/>
          </svg>
          <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-secondary)', margin: 0 }}>
            Drop PCB image here
          </p>
          <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: 0 }}>
            JPG, PNG, WEBP up to 10MB
          </p>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              style={{ display: 'none' }}
              onChange={handleInputChange}
            />
            <button
              onClick={() => !disabled && inputRef.current?.click()}
              disabled={disabled}
              style={{
                background: 'var(--copper)', color: '#0D0F0E',
                border: 'none', borderRadius: 'var(--radius-md)',
                padding: '10px 20px', fontSize: 14, fontWeight: 500,
                fontFamily: "'Inter', sans-serif", cursor: disabled ? 'not-allowed' : 'pointer',
              }}
              onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = 'var(--copper-muted)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--copper)'; }}
            >
              Browse files
            </button>
            <button
              onClick={() => !disabled && onCameraOpen()}
              disabled={disabled}
              style={{
                background: 'transparent', color: 'var(--text-secondary)',
                border: '0.5px solid var(--bg-border)',
                borderRadius: 'var(--radius-md)',
                padding: '10px 20px', fontSize: 14, fontWeight: 500,
                fontFamily: "'Inter', sans-serif", cursor: disabled ? 'not-allowed' : 'pointer',
              }}
              onMouseEnter={e => { if (!disabled) { e.currentTarget.style.background = 'var(--bg-elevated)'; e.currentTarget.style.color = 'var(--text-primary)'; } }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
            >
              Use camera
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
