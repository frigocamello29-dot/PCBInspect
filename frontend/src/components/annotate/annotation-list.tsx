'use client';

import { Annotation } from './annotate-canvas';
import { DEFECT_COLORS } from '@/lib/poll';

interface DefectType {
  id: number;
  name: string;
  severity: string;
}

interface Props {
  annotations: Annotation[];
  activeId: string | null;
  defectTypes: DefectType[];
  onSelect: (id: string) => void;
  onUpdate: (ann: Annotation) => void;
  onDelete: (id: string) => void;
  onSave: () => void;
  saving: boolean;
  savedDetectionId: string | null;
  imageReady: boolean;
}

const SEVERITY_COLORS: Record<string, string> = {
  low: '#22C55E',
  medium: '#F59E0B',
  high: '#EF4444',
  critical: '#DC2626',
};

export default function AnnotationList({
  annotations, activeId, defectTypes,
  onSelect, onUpdate, onDelete,
  onSave, saving, savedDetectionId, imageReady,
}: Props) {
  const canSave = imageReady && annotations.length > 0 && !saving &&
    annotations.every((a) => a.class_id > 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 13, fontWeight: 500,
          color: 'var(--text-secondary)',
        }}>
          {annotations.length === 0
            ? 'No annotations'
            : `${annotations.length} annotation${annotations.length === 1 ? '' : 's'}`}
        </span>
      </div>

      {/* Annotation rows */}
      {annotations.length === 0 ? (
        <div style={{
          background: 'var(--bg-surface)',
          border: '0.5px solid var(--bg-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '40px 24px',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: 0, fontFamily: "'Inter', sans-serif" }}>
            {imageReady
              ? 'Switch to Draw mode and drag on the image to add annotations.'
              : 'Upload an image to start annotating.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {annotations.map((ann, i) => {
            const color = DEFECT_COLORS[ann.class_id] ?? '#ffffff';
            const isActive = ann.id === activeId;
            const dt = defectTypes.find((d) => d.id === ann.class_id);
            return (
              <div
                key={ann.id}
                onClick={() => onSelect(ann.id)}
                style={{
                  background: isActive ? 'var(--bg-elevated)' : 'var(--bg-surface)',
                  border: `0.5px solid ${isActive ? color + '60' : 'var(--bg-border)'}`,
                  borderLeft: `3px solid ${color}`,
                  borderRadius: 'var(--radius-lg)',
                  padding: '12px 14px',
                  cursor: 'pointer',
                  transition: 'background 100ms ease, border-color 100ms ease',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.background = 'var(--bg-elevated)';
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.background = 'var(--bg-surface)';
                }}
              >
                {/* Row header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 11, color, fontWeight: 600,
                    minWidth: 24,
                  }}>
                    #{i + 1}
                  </span>

                  {/* Class dropdown */}
                  <select
                    value={ann.class_id}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      e.stopPropagation();
                      onUpdate({ ...ann, class_id: Number(e.target.value) });
                    }}
                    style={{
                      flex: 1,
                      background: 'var(--bg-base)',
                      color: 'var(--text-primary)',
                      border: '0.5px solid var(--bg-border)',
                      borderRadius: 'var(--radius-md)',
                      padding: '4px 8px',
                      fontSize: 12,
                      fontFamily: "'Inter', sans-serif",
                      cursor: 'pointer',
                    }}
                  >
                    {defectTypes.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>

                  {/* Severity badge */}
                  {dt && (
                    <span style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 10, fontWeight: 600,
                      color: SEVERITY_COLORS[dt.severity] ?? 'var(--text-secondary)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      flexShrink: 0,
                    }}>
                      {dt.severity}
                    </span>
                  )}

                  {/* Delete */}
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(ann.id); }}
                    title="Remove annotation"
                    style={{
                      background: 'transparent',
                      color: 'var(--text-dim)',
                      border: 'none',
                      borderRadius: 'var(--radius-sm)',
                      padding: '2px 6px',
                      fontSize: 14,
                      cursor: 'pointer',
                      lineHeight: 1,
                      flexShrink: 0,
                      transition: 'color 100ms ease',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--red-fail)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-dim)'; }}
                  >
                    ×
                  </button>
                </div>

                {/* Confidence slider */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: "'Inter', sans-serif", minWidth: 68 }}>
                    Confidence
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={Math.round(ann.confidence * 100)}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      e.stopPropagation();
                      onUpdate({ ...ann, confidence: Number(e.target.value) / 100 });
                    }}
                    style={{ flex: 1, accentColor: color, cursor: 'pointer' }}
                  />
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 11, color: 'var(--text-secondary)',
                    minWidth: 32, textAlign: 'right',
                  }}>
                    {Math.round(ann.confidence * 100)}%
                  </span>
                </div>

                {/* Bbox coords */}
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 10, color: 'var(--text-dim)',
                  letterSpacing: '0.02em',
                }}>
                  x1:{Math.round(ann.bbox.x1)} y1:{Math.round(ann.bbox.y1)}&nbsp;
                  x2:{Math.round(ann.bbox.x2)} y2:{Math.round(ann.bbox.y2)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Save button */}
      <button
        onClick={onSave}
        disabled={!canSave}
        style={{
          background: canSave ? 'var(--copper)' : 'var(--bg-border)',
          color: canSave ? '#0D0F0E' : 'var(--text-dim)',
          border: 'none',
          borderRadius: 'var(--radius-md)',
          padding: '12px 24px',
          fontSize: 14, fontWeight: 500,
          fontFamily: "'Inter', sans-serif",
          cursor: canSave ? 'pointer' : 'not-allowed',
          width: '100%',
          transition: 'background 150ms ease',
        }}
        onMouseEnter={(e) => { if (canSave) e.currentTarget.style.background = 'var(--copper-muted)'; }}
        onMouseLeave={(e) => { if (canSave) e.currentTarget.style.background = 'var(--copper)'; }}
      >
        {saving ? 'Saving…' : 'Save annotations'}
      </button>

      {/* Success message */}
      {savedDetectionId && (
        <div style={{
          background: '#22C55E18',
          border: '0.5px solid #22C55E40',
          borderRadius: 'var(--radius-md)',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}>
          <span style={{ fontSize: 13, color: '#22C55E', fontFamily: "'Inter', sans-serif" }}>
            Annotations saved.
          </span>
          <a
            href={`/detections/${savedDetectionId}`}
            style={{
              fontSize: 13, fontWeight: 500,
              color: 'var(--copper)',
              textDecoration: 'none',
              fontFamily: "'Inter', sans-serif",
              flexShrink: 0,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline'; }}
            onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none'; }}
          >
            View in history →
          </a>
        </div>
      )}
    </div>
  );
}
