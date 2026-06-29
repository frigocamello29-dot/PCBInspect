'use client';

import { useState } from 'react';
import { StatusResponse, Finding, DEFECT_COLORS, serverImageUrl } from '@/lib/poll';
import BboxCanvas from './bbox-canvas';
import { useT } from '@/hooks/use-t';

interface ResultsPanelProps {
  phase: 'idle' | 'analyzing' | 'done' | 'error';
  pollResult: StatusResponse | null;
  errorMsg: string | null;
  activeFindingId: string | null;
  elapsed: number;
  onFindingClick: (id: string) => void;
}

const SEVERITY_COLORS: Record<string, string> = {
  low: '#22C55E',
  medium: '#F59E0B',
  high: '#EF4444',
  critical: '#DC2626',
};

export default function ResultsPanel({ phase, pollResult, errorMsg, activeFindingId, elapsed, onFindingClick }: ResultsPanelProps) {
  const t = useT();
  const [showOverlay, setShowOverlay] = useState(true);

  if (phase === 'idle') {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 12, minHeight: 280, padding: 32,
        background: 'var(--bg-surface)', border: '0.5px solid var(--bg-border)',
        borderRadius: 'var(--radius-lg)', textAlign: 'center',
      }}>
        <p style={{ fontSize: 15, color: 'var(--text-dim)', margin: 0 }}>{t.results_idle_title}</p>
        <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: 0 }}>{t.results_idle_sub}</p>
      </div>
    );
  }

  if (phase === 'analyzing') {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 16, minHeight: 280, padding: 32,
        background: 'var(--bg-surface)', border: '0.5px solid var(--bg-border)',
        borderRadius: 'var(--radius-lg)',
      }}>
        <div style={{ width: 56, height: 56, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            border: '2px solid var(--copper)',
            animation: 'pcb-pulse 1.5s ease-in-out infinite',
          }} />
          <svg width="26" height="26" viewBox="0 0 48 48" fill="none">
            <rect x="8" y="8" width="32" height="32" rx="4" stroke="var(--copper)" strokeWidth="2"/>
            <rect x="16" y="16" width="16" height="16" rx="2" stroke="var(--copper)" strokeWidth="2"/>
          </svg>
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: 'var(--copper)', margin: 0 }}>
            {t.analyzing}
          </p>
          <p style={{ fontSize: 11, color: 'var(--text-dim)', margin: '4px 0 0', fontFamily: "'JetBrains Mono', monospace" }}>
            {elapsed}s
          </p>
        </div>
        <style>{`@keyframes pcb-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(1.2)} }`}</style>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 12, minHeight: 280, padding: 32,
        background: 'var(--bg-surface)', border: '0.5px solid rgba(239,68,68,0.3)',
        borderRadius: 'var(--radius-lg)', textAlign: 'center',
      }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="var(--red-fail)" strokeWidth="1.5"/>
          <line x1="12" y1="7" x2="12" y2="13" stroke="var(--red-fail)" strokeWidth="1.5" strokeLinecap="round"/>
          <circle cx="12" cy="16.5" r="1" fill="var(--red-fail)"/>
        </svg>
        <p style={{ fontSize: 13, color: 'var(--red-fail)', margin: 0, maxWidth: 320 }}>
          {errorMsg ?? t.results_error_generic}
        </p>
      </div>
    );
  }

  // done
  const detection = pollResult?.detection;
  const findings = pollResult?.findings ?? [];
  const isDefective = detection?.is_defective ?? false;
  const defectCount = detection?.defect_count ?? 0;
  const imageUrl = detection ? serverImageUrl(detection.image_path) : '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* summary bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
        padding: '8px 12px',
        background: 'var(--bg-surface)', border: '0.5px solid var(--bg-border)',
        borderRadius: 'var(--radius-md)',
      }}>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600,
          letterSpacing: '0.05em', textTransform: 'uppercase',
          padding: '3px 8px', borderRadius: 'var(--radius-sm)',
          background: isDefective ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.12)',
          color: isDefective ? 'var(--red-fail)' : 'var(--green-pass)',
        }}>
          {isDefective ? t.defects_found(defectCount) : t.no_defects_found}
        </span>
        <span style={{ flex: 1 }} />
        {detection?.inference_time_ms != null && (
          <span style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: "'JetBrains Mono', monospace" }}>
            {detection.inference_time_ms}ms
          </span>
        )}
        {detection?.model_version && (
          <span style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: "'JetBrains Mono', monospace" }}>
            {detection.model_version}
          </span>
        )}
        <button
          onClick={() => setShowOverlay(v => !v)}
          style={{
            background: showOverlay ? 'rgba(200,121,65,0.12)' : 'transparent',
            color: showOverlay ? 'var(--copper)' : 'var(--text-secondary)',
            border: `0.5px solid ${showOverlay ? 'var(--copper-muted)' : 'var(--bg-border)'}`,
            borderRadius: 'var(--radius-sm)', padding: '3px 8px', fontSize: 11,
            fontFamily: "'JetBrains Mono', monospace", cursor: 'pointer',
          }}
        >
          {showOverlay ? t.results_overlay : t.results_original}
        </button>
      </div>

      {/* image + canvas */}
      {imageUrl && (
        <BboxCanvas
          imageUrl={imageUrl}
          findings={findings}
          activeFindingId={activeFindingId}
          onFindingClick={onFindingClick}
          showOverlay={showOverlay}
        />
      )}

      {/* findings list */}
      {findings.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
          {findings.map((f: Finding) => {
            const color = DEFECT_COLORS[f.defect_type.id] ?? '#ffffff';
            const isActive = f.id === activeFindingId;
            const sevColor = SEVERITY_COLORS[f.defect_type.severity] ?? '#8A9189';
            return (
              <div
                key={f.id}
                onClick={() => onFindingClick(f.id)}
                style={{
                  padding: '10px 14px', borderRadius: 'var(--radius-md)',
                  background: isActive ? 'var(--bg-elevated)' : 'var(--bg-surface)',
                  border: '0.5px solid var(--bg-border)',
                  borderLeft: `${isActive ? 3 : 1}px solid ${color}`,
                  cursor: 'pointer', transition: 'background 100ms ease',
                  display: 'flex', flexDirection: 'column', gap: 6,
                }}
                onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-elevated)'; }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-surface)'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', flex: 1 }}>
                    {t.defect_name(f.defect_type.id, f.defect_type.name)}
                  </span>
                  <span style={{
                    fontSize: 10, fontFamily: "'JetBrains Mono', monospace",
                    letterSpacing: '0.05em', textTransform: 'uppercase',
                    padding: '2px 6px', borderRadius: 'var(--radius-sm)',
                    background: sevColor + '20', color: sevColor,
                  }}>
                    {t.severity_label(f.defect_type.severity)}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1, height: 4, background: 'var(--bg-border)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(f.confidence * 100).toFixed(0)}%`, background: color, borderRadius: 2 }} />
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 }}>
                    {(f.confidence * 100).toFixed(0)}%
                  </span>
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: "'JetBrains Mono', monospace" }}>
                  x1:{f.bbox.x1} y1:{f.bbox.y1} x2:{f.bbox.x2} y2:{f.bbox.y2}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
