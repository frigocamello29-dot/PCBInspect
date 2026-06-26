'use client';

import { useState, useEffect } from 'react';
import ProtectedLayout from '@/components/layout/protected-layout';
import DefectCard, { DefectType } from '@/components/defects/defect-card';
import { apiGet } from '@/lib/api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

function ExampleModal({ defect, onClose }: { defect: DefectType; onClose: () => void }) {
  // close on Escape
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const imgUrl = defect.example_image_url
    ? defect.example_image_url.startsWith('http')
      ? defect.example_image_url
      : `${API_BASE}/${defect.example_image_url.replace(/^\//, '')}`
    : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Example of ${defect.name}`}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 50, padding: 24,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'var(--bg-elevated)',
        border: '0.5px solid var(--bg-border)',
        borderRadius: 'var(--radius-xl)',
        overflow: 'hidden',
        maxWidth: 560,
        width: '100%',
        boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
      }}>
        {/* header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '0.5px solid var(--bg-border)',
        }}>
          <div>
            <span style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 500, fontSize: 15,
              color: 'var(--text-primary)',
            }}>{defect.name}</span>
            <span style={{
              fontSize: 12, color: 'var(--text-dim)',
              fontFamily: "'JetBrains Mono', monospace",
              marginLeft: 10,
            }}>defect class {defect.id}</span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            style={{
              background: 'none', border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer', fontSize: 20, lineHeight: 1,
              padding: 4,
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
          >
            ×
          </button>
        </div>

        {/* image */}
        <div style={{
          background: 'var(--bg-surface)',
          minHeight: 240,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {imgUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={imgUrl}
              alt={`Example of ${defect.name} defect on a PCB`}
              style={{ maxWidth: '100%', maxHeight: 320, objectFit: 'contain', display: 'block' }}
            />
          ) : (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true" style={{ opacity: 0.2, margin: '0 auto 12px' }}>
                <rect x="6" y="6" width="36" height="36" rx="4" stroke="var(--text-dim)" strokeWidth="1.5"/>
                <circle cx="18" cy="18" r="5" stroke="var(--text-dim)" strokeWidth="1.5"/>
                <path d="M6 32 L16 22 L24 30 L32 20 L42 32" stroke="var(--text-dim)" strokeWidth="1.5"/>
              </svg>
              <p style={{ color: 'var(--text-dim)', fontSize: 13, margin: 0 }}>No example image available</p>
            </div>
          )}
        </div>

        {/* caption */}
        <div style={{ padding: '14px 20px', borderTop: '0.5px solid var(--bg-border)' }}>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
            {defect.description}
          </p>
        </div>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '0.5px solid var(--bg-border)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '24px 24px 20px',
        borderBottom: '0.5px solid var(--bg-border)',
        display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <div className="shimmer" style={{ width: 48, height: 48, borderRadius: 'var(--radius-md)', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div className="shimmer" style={{ height: 16, width: '60%', borderRadius: 4, marginBottom: 8 }} />
          <div className="shimmer" style={{ height: 12, width: 60, borderRadius: 4 }} />
        </div>
      </div>
      <div style={{ padding: '16px 20px 20px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div className="shimmer" style={{ height: 12, borderRadius: 4 }} />
        <div className="shimmer" style={{ height: 12, borderRadius: 4 }} />
        <div className="shimmer" style={{ height: 12, width: '70%', borderRadius: 4 }} />
        <div className="shimmer" style={{ height: 13, width: 100, borderRadius: 4, marginTop: 6 }} />
      </div>
    </div>
  );
}

export default function DefectTypesPage() {
  const [defects, setDefects] = useState<DefectType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalDefect, setModalDefect] = useState<DefectType | null>(null);

  useEffect(() => {
    apiGet<DefectType[]>('/api/defect-types')
      .then(setDefects)
      .catch(() => setError('Failed to load defect types.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <ProtectedLayout>
      <style>{`
        .defect-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }
        @media (max-width: 1023px) {
          .defect-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 639px) {
          .defect-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      {modalDefect && (
        <ExampleModal defect={modalDefect} onClose={() => setModalDefect(null)} />
      )}

      <div style={{ padding: '32px 24px', maxWidth: 1100, margin: '0 auto' }}>
        <h1 style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 22, fontWeight: 500,
          color: 'var(--text-primary)', margin: 0,
        }}>
          PCB Defect Reference
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 6, marginBottom: 32 }}>
          6 standard defect classes
        </p>

        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.08)',
            border: '0.5px solid rgba(239,68,68,0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px',
            color: 'var(--red-fail)', fontSize: 13,
            marginBottom: 24,
          }} role="alert">
            {error}
          </div>
        )}

        <div className="defect-grid">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
            : defects.map(d => (
                <DefectCard
                  key={d.id}
                  defect={d}
                  onViewExample={setModalDefect}
                />
              ))
          }
        </div>
      </div>
    </ProtectedLayout>
  );
}
