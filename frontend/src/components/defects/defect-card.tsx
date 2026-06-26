'use client';

import { useState } from 'react';
import { useT } from '@/hooks/use-t';

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

interface DefectCardProps {
  defect: DefectType;
  onViewExample: (defect: DefectType) => void;
}

export default function DefectCard({ defect, onViewExample }: DefectCardProps) {
  const t = useT();
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
          width: 56, height: 56,
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
          flexShrink: 0,
          border: `1px solid ${color}40`,
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/defect-examples/defect-thumb-${defect.id}.jpg`}
            alt={`${defect.name} defect example`}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 500,
            fontSize: 15,
            color: 'var(--text-primary)',
            marginBottom: 6,
          }}>{t.defect_name(defect.id, defect.name)}</div>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            color: sevColor,
            background: `${sevColor}18`,
            padding: '2px 8px',
            borderRadius: 'var(--radius-sm)',
          }}>{t.severity_label(defect.severity)}</span>
        </div>
      </div>

      {/* body */}
      <div style={{ padding: '16px 20px 20px', flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <p style={{
          fontSize: 13,
          color: 'var(--text-secondary)',
          lineHeight: 1.6,
          margin: 0,
        }}>{t.defect_description(defect.id, defect.description)}</p>
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
          {t.view_example}
        </button>
      </div>
    </div>
  );
}
