'use client';

import { CorrectionItem } from './annotation-canvas';
import { Finding, DEFECT_COLORS } from '@/lib/poll';
import { useT } from '@/hooks/use-t';

interface DefectType { id: number; name: string; severity: string; }

interface Props {
  modelFindings: Finding[];
  corrections: CorrectionItem[];
  activeId: string | null;
  defectTypes: DefectType[];
  onRemoveFinding: (findingId: string) => void;
  onRestoreFinding: (finding: Finding) => void;
  onCorrectionSelect: (id: string | null) => void;
  onCorrectionUpdate: (item: CorrectionItem) => void;
  onCorrectionDelete: (id: string) => void;
  onSave: () => void;
  onUndo: () => void;
  canUndo: boolean;
  saving: boolean;
  saved: boolean;
  saveError: string | null;
}

export default function CorrectionList({
  modelFindings, corrections, activeId, defectTypes,
  onRemoveFinding, onRestoreFinding, onCorrectionSelect, onCorrectionUpdate, onCorrectionDelete,
  onSave, onUndo, canUndo, saving, saved, saveError,
}: Props) {
  const t = useT();

  const canSave = !saving && corrections.every(c => c.class_id > 0);
  const addedCount = corrections.filter(c => c.tag === 'new').length;
  const editedCount = corrections.filter(c => c.tag === 'edited').length;
  const removedCount = modelFindings.filter(f => !corrections.some(c => c.findingId === String(f.id))).length;
  const hasDiff = addedCount > 0 || editedCount > 0 || removedCount > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Section 1 — Model Findings (read-only) */}
      <div style={{
        background: 'var(--bg-surface)', border: '0.5px solid var(--bg-border)',
        borderRadius: 'var(--radius-lg)', padding: 16,
      }}>
        <p style={{
          fontSize: 11, color: 'var(--text-dim)',
          fontFamily: "'JetBrains Mono', monospace",
          margin: '0 0 10px', letterSpacing: '0.05em',
        }}>
          {t.correct_model_section}
        </p>

        {modelFindings.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--text-dim)', fontFamily: "'Inter', sans-serif", margin: 0 }}>
            {t.correct_no_model_findings}
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {modelFindings.map(f => {
              const isRemoved = !corrections.some(c => c.findingId === String(f.id));
              const clr = DEFECT_COLORS[f.defect_type.id] ?? '#8A9189';
              return (
                <div
                  key={String(f.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '7px 10px',
                    borderRadius: 'var(--radius-md)',
                    border: '0.5px solid var(--bg-border)',
                    background: isRemoved ? 'transparent' : 'var(--bg-elevated)',
                    opacity: isRemoved ? 0.45 : 1,
                    transition: 'opacity 150ms ease',
                  }}
                >
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: clr, flexShrink: 0,
                  }} />
                  <span style={{
                    flex: 1, fontSize: 12, fontFamily: "'Inter', sans-serif",
                    color: isRemoved ? 'var(--text-dim)' : 'var(--text-primary)',
                    textDecoration: isRemoved ? 'line-through' : 'none',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {t.defect_name(f.defect_type.id, f.defect_type.name)}
                  </span>
                  <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-dim)', flexShrink: 0 }}>
                    {Math.round(f.confidence * 100)}%
                  </span>
                  <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-dim)', flexShrink: 0 }}>
                    {f.bbox.x1},{f.bbox.y1}–{f.bbox.x2},{f.bbox.y2}
                  </span>

                  {isRemoved ? (
                    <>
                      <span style={{
                        fontSize: 9, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600,
                        color: 'var(--red-fail)', letterSpacing: '0.05em', flexShrink: 0,
                      }}>
                        {t.correct_removed_label}
                      </span>
                      <button
                        onClick={() => onRestoreFinding(f)}
                        title="Restore"
                        style={{
                          background: 'transparent', border: 'none',
                          color: 'var(--copper)', cursor: 'pointer',
                          fontSize: 14, lineHeight: 1, padding: '0 2px', flexShrink: 0,
                        }}
                        onMouseEnter={e => { e.currentTarget.style.color = 'var(--copper-muted)'; }}
                        onMouseLeave={e => { e.currentTarget.style.color = 'var(--copper)'; }}
                      >↩</button>
                    </>
                  ) : (
                    <button
                      onClick={() => onRemoveFinding(String(f.id))}
                      title="Mark removed"
                      style={{
                        background: 'transparent', border: 'none',
                        color: 'var(--text-dim)', cursor: 'pointer',
                        fontSize: 16, lineHeight: 1, padding: '0 2px', flexShrink: 0,
                        transition: 'color 100ms ease',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.color = 'var(--red-fail)'; }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-dim)'; }}
                    >×</button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Section 2 — Corrections */}
      <div style={{
        background: 'var(--bg-surface)', border: '0.5px solid var(--bg-border)',
        borderRadius: 'var(--radius-lg)', padding: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <p style={{
            fontSize: 11, color: 'var(--text-dim)',
            fontFamily: "'JetBrains Mono', monospace",
            margin: 0, letterSpacing: '0.05em',
          }}>
            {t.correct_corrections_section}
          </p>
          {hasDiff && (
            <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: "'Inter', sans-serif" }}>
              {t.correct_diff_bar(addedCount, editedCount, removedCount)}
            </span>
          )}
        </div>

        {corrections.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--text-dim)', fontFamily: "'Inter', sans-serif", margin: 0 }}>
            {t.correct_no_corrections}
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {corrections.map(item => {
              const isActive = item.id === activeId;
              const clr = item.tag === 'new' ? '#C87941' : item.tag === 'edited' ? '#F59E0B' : (DEFECT_COLORS[item.class_id] ?? '#ffffff');
              return (
                <div
                  key={item.id}
                  onClick={() => onCorrectionSelect(item.id)}
                  style={{
                    borderLeft: `3px solid ${clr}`,
                    borderTop: '0.5px solid var(--bg-border)',
                    borderRight: '0.5px solid var(--bg-border)',
                    borderBottom: '0.5px solid var(--bg-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '9px 10px 9px 12px',
                    background: isActive ? 'var(--bg-elevated)' : 'transparent',
                    cursor: 'pointer',
                    transition: 'background 100ms ease',
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--bg-elevated)'; }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    {item.tag !== 'unchanged' && (
                      <span style={{
                        fontSize: 9, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700,
                        letterSpacing: '0.06em', color: '#0D0F0E',
                        background: clr, padding: '2px 5px', borderRadius: 3,
                        flexShrink: 0,
                      }}>
                        {item.tag === 'new' ? t.tag_new : t.tag_edited}
                      </span>
                    )}

                    <select
                      value={item.class_id}
                      onClick={e => e.stopPropagation()}
                      onChange={e => { e.stopPropagation(); onCorrectionUpdate({ ...item, class_id: Number(e.target.value) }); }}
                      style={{
                        flex: 1, background: 'var(--bg-base)', color: 'var(--text-primary)',
                        border: '0.5px solid var(--bg-border)', borderRadius: 'var(--radius-md)',
                        padding: '4px 8px', fontSize: 12, fontFamily: "'Inter', sans-serif",
                        cursor: 'pointer',
                      }}
                    >
                      {defectTypes.map(d => (
                        <option key={d.id} value={d.id}>{t.defect_name(d.id, d.name)}</option>
                      ))}
                    </select>

                    <button
                      onClick={e => { e.stopPropagation(); onCorrectionDelete(item.id); }}
                      title="Remove"
                      style={{
                        background: 'transparent', border: 'none',
                        color: 'var(--text-dim)', cursor: 'pointer',
                        fontSize: 16, lineHeight: 1, padding: '0 2px', flexShrink: 0,
                        transition: 'color 100ms ease',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.color = 'var(--red-fail)'; }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-dim)'; }}
                    >×</button>
                  </div>

                  <div style={{
                    fontSize: 10, color: 'var(--text-dim)',
                    fontFamily: "'JetBrains Mono', monospace",
                  }}>
                    x1:{Math.round(item.bbox.x1)} y1:{Math.round(item.bbox.y1)}&nbsp;
                    x2:{Math.round(item.bbox.x2)} y2:{Math.round(item.bbox.y2)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Undo + Save */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={onUndo}
          disabled={!canUndo}
          style={{
            padding: '10px 16px', borderRadius: 'var(--radius-md)',
            background: 'transparent',
            color: canUndo ? 'var(--text-secondary)' : 'var(--text-dim)',
            border: '0.5px solid var(--bg-border)',
            fontSize: 13, fontFamily: "'Inter', sans-serif",
            cursor: canUndo ? 'pointer' : 'not-allowed',
            flexShrink: 0,
            transition: 'background 150ms ease, color 150ms ease',
          }}
          onMouseEnter={e => { if (canUndo) { e.currentTarget.style.background = 'var(--bg-elevated)'; e.currentTarget.style.color = 'var(--text-primary)'; } }}
          onMouseLeave={e => { if (canUndo) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; } }}
        >
          {t.correct_undo}
        </button>

        <button
          onClick={onSave}
          disabled={!canSave}
          style={{
            flex: 1, padding: '10px 0', borderRadius: 'var(--radius-md)',
            background: canSave ? 'var(--copper)' : 'var(--bg-border)',
            color: canSave ? '#0D0F0E' : 'var(--text-dim)',
            border: 'none', fontSize: 14, fontWeight: 500,
            fontFamily: "'Inter', sans-serif",
            cursor: canSave ? 'pointer' : 'not-allowed',
            transition: 'background 150ms ease',
          }}
          onMouseEnter={e => { if (canSave) e.currentTarget.style.background = 'var(--copper-muted)'; }}
          onMouseLeave={e => { if (canSave) e.currentTarget.style.background = 'var(--copper)'; }}
        >
          {saving ? t.correct_saving : t.correct_save}
        </button>
      </div>

      {saved && (
        <div style={{
          background: '#22C55E18', border: '0.5px solid #22C55E40',
          borderRadius: 'var(--radius-md)', padding: '12px 16px',
          fontSize: 13, color: '#22C55E', fontFamily: "'Inter', sans-serif",
        }}>
          {t.correct_saved}
        </div>
      )}

      {saveError && (
        <div style={{
          background: '#EF444418', border: '0.5px solid #EF444440',
          borderRadius: 'var(--radius-md)', padding: '12px 16px',
          fontSize: 13, color: 'var(--red-fail)', fontFamily: "'Inter', sans-serif",
        }}>
          {saveError}
        </div>
      )}
    </div>
  );
}
