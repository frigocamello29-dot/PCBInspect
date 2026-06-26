'use client';

import { useState } from 'react';

export interface DefectType {
  id: number;
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  icon_name?: string;
  example_image_url?: string | null;
}

const DEFECT_COLORS: Record<number, string> = {
  1: '#EF4444',
  2: '#F59E0B',
  3: '#EF4444',
  4: '#F97316',
  5: '#A78BFA',
  6: '#F59E0B',
};

const SEVERITY_COLOR: Record<string, string> = {
  low: '#22C55E',
  medium: '#F59E0B',
  high: '#EF4444',
  critical: '#DC2626',
};

function DefectIcon({ id, color }: { id: number; color: string }) {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      {id === 1 && (
        <>
          <rect x="4" y="4" width="24" height="24" rx="3" stroke={color} strokeWidth="1.5"/>
          <circle cx="16" cy="16" r="5" stroke={color} strokeWidth="1.5" strokeDasharray="3 2"/>
          <line x1="16" y1="4" x2="16" y2="11" stroke={color} strokeWidth="1.5"/>
          <line x1="16" y1="21" x2="16" y2="28" stroke={color} strokeWidth="1.5"/>
        </>
      )}
      {id === 2 && (
        <>
          <path d="M4 16 H28" stroke={color} strokeWidth="1.5"/>
          <path d="M4 10 H28" stroke={color} strokeWidth="1.5"/>
          <path d="M4 22 H20 Q22 22 24 19" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
          <circle cx="24" cy="22" r="2" fill={color} opacity="0.5"/>
        </>
      )}
      {id === 3 && (
        <>
          <path d="M4 16 H12" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M20 16 H28" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="14" y1="14" x2="18" y2="18" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="14" y1="18" x2="18" y2="14" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
        </>
      )}
      {id === 4 && (
        <>
          <path d="M4 10 H28" stroke={color} strokeWidth="1.5"/>
          <path d="M4 22 H28" stroke={color} strokeWidth="1.5"/>
          <path d="M16 10 L16 22" stroke={color} strokeWidth="1.5" strokeDasharray="2 2"/>
        </>
      )}
      {id === 5 && (
        <>
          <path d="M4 16 H28" stroke={color} strokeWidth="1.5"/>
          <path d="M18 16 L22 11" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
          <circle cx="22" cy="10" r="2" fill={color} opacity="0.6"/>
        </>
      )}
      {id === 6 && (
        <>
          <rect x="4" y="4" width="24" height="24" rx="3" stroke={color} strokeWidth="1.5"/>
          <rect x="10" y="10" width="8" height="5" rx="1" fill={color} opacity="0.4"/>
          <rect x="14" y="18" width="10" height="4" rx="1" fill={color} opacity="0.5"/>
        </>
      )}
    </svg>
  );
}

interface DefectCardProps {
  defect: DefectType;
  onViewExample: (defect: DefectType) => void;
}

export default function DefectCard({ defect, onViewExample }: DefectCardProps) {
  const color = DEFECT_COLORS[defect.id] ?? '#8A9189';
  const sevColor = SEVERITY_COLOR[defect.severity] ?? '#8A9189';
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: `0.5px solid ${hovered ? 'var(--copper-muted)' : 'var(--bg-border)'}`,
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        transition: 'border-color 150ms ease',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* colored icon area */}
      <div style={{
        background: `${color}18`,
        padding: '24px 24px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        borderBottom: '0.5px solid var(--bg-border)',
      }}>
        <div style={{
          width: 48, height: 48,
          background: `${color}22`,
          borderRadius: 'var(--radius-md)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <DefectIcon id={defect.id} color={color} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 500,
            fontSize: 15,
            color: 'var(--text-primary)',
            marginBottom: 6,
          }}>{defect.name}</div>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            color: sevColor,
            background: `${sevColor}18`,
            padding: '2px 8px',
            borderRadius: 'var(--radius-sm)',
          }}>{defect.severity}</span>
        </div>
      </div>

      {/* body */}
      <div style={{ padding: '16px 20px 20px', flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <p style={{
          fontSize: 13,
          color: 'var(--text-secondary)',
          lineHeight: 1.6,
          margin: 0,
        }}>{defect.description}</p>
        <button
          onClick={() => onViewExample(defect)}
          style={{
            alignSelf: 'flex-start',
            background: 'none',
            border: 'none',
            color: 'var(--copper)',
            fontFamily: "'Inter', sans-serif",
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            padding: 0,
          }}
          onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
          onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
          aria-label={`View example of ${defect.name}`}
        >
          View example →
        </button>
      </div>
    </div>
  );
}
