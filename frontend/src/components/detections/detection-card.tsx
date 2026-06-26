'use client';

import Link from 'next/link';
import { DetectionSummary, serverImageUrl } from '@/lib/poll';

function badge(d: DetectionSummary) {
  if (d.status !== 'completed') return { label: d.status.toUpperCase(), color: '#8A9189', bg: 'rgba(138,145,137,0.12)' };
  if (!d.is_defective) return { label: 'PASS', color: '#22C55E', bg: 'rgba(34,197,94,0.12)' };
  if (d.defect_count >= 3) return { label: `${d.defect_count} DEFECTS`, color: '#EF4444', bg: 'rgba(239,68,68,0.12)' };
  return { label: `${d.defect_count} DEFECT${d.defect_count > 1 ? 'S' : ''}`, color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' };
}

export default function DetectionCard({ d }: { d: DetectionSummary }) {
  const { label, color, bg } = badge(d);
  const thumb = d.thumbnail_path ? serverImageUrl(d.thumbnail_path) : null;
  const date = new Date(d.created_at);
  const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

  return (
    <Link href={`/detections/${d.id}`} style={{ textDecoration: 'none' }}>
      <div style={{
        background: 'var(--bg-surface)',
        border: '0.5px solid var(--bg-border)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'border-color 150ms ease',
      }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--copper-muted)')}
        onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--bg-border)')}
      >
        <div style={{ position: 'relative', paddingBottom: '56.25%', background: 'var(--bg-elevated)' }}>
          {thumb ? (
            <img
              src={thumb}
              alt="PCB thumbnail"
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="32" height="20" viewBox="0 0 64 40" fill="none" opacity="0.2">
                <path d="M4 20 H16 V8 H48 V20 H60" stroke="var(--copper)" strokeWidth="2"/>
                <circle cx="16" cy="20" r="3" fill="var(--copper)"/>
                <circle cx="48" cy="20" r="3" fill="var(--copper)"/>
              </svg>
            </div>
          )}
        </div>
        <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: '0.05em',
            color,
            background: bg,
            padding: '2px 6px',
            borderRadius: 'var(--radius-sm)',
            alignSelf: 'flex-start',
          }}>{label}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--text-dim)' }}>
              {dateStr}, {timeStr}
            </span>
            {d.model_version === 'manual' && (
              <span style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10, fontWeight: 600,
                letterSpacing: '0.05em',
                color: '#A78BFA',
                background: 'rgba(167,139,250,0.12)',
                padding: '1px 5px',
                borderRadius: 'var(--radius-sm)',
              }}>MANUAL</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
