'use client';

import { useParams } from 'next/navigation';
import { useEffect, useReducer, useRef, useState } from 'react';
import Link from 'next/link';
import ProtectedLayout from '@/components/layout/protected-layout';
import AnnotationCanvas, {
  CorrectionItem, DiffTag, AnnotationMode,
} from '@/components/annotate/annotation-canvas';
import CorrectionList from '@/components/annotate/correction-list';
import { apiGet, apiPost, ApiError } from '@/lib/api';
import { Finding, DetectionSummary, serverImageUrl } from '@/lib/poll';
import { useT } from '@/hooks/use-t';

interface DefectType { id: number; name: string; severity: string; description: string; }

interface AnnotationsResponse {
  model_findings: Finding[];
  correction: {
    id: string;
    findings: Array<{
      class_id: number;
      bbox_x1: number; bbox_y1: number;
      bbox_x2: number; bbox_y2: number;
    }>;
  } | null;
}

interface DetectionDetail { detection: DetectionSummary; findings: Finding[]; }
interface SaveBody { findings: Array<{ class_id: number; bbox_x1: number; bbox_y1: number; bbox_x2: number; bbox_y2: number }>; }

// ── Undo history reducer ────────────────────────────────────────────────────

interface HistoryState { past: CorrectionItem[][]; present: CorrectionItem[]; }
type HistoryAction =
  | { type: 'RESET'; items: CorrectionItem[] }          // initialize, clears past
  | { type: 'SET'; items: CorrectionItem[] }            // mutation — pushes to past
  | { type: 'UPDATE_ITEM'; item: CorrectionItem }       // transient update, no past push
  | { type: 'UNDO' };

function historyReducer(state: HistoryState, action: HistoryAction): HistoryState {
  switch (action.type) {
    case 'RESET':
      return { past: [], present: action.items };
    case 'UNDO':
      if (state.past.length === 0) return state;
      return { past: state.past.slice(0, -1), present: state.past[state.past.length - 1] };
    case 'UPDATE_ITEM':
      return {
        ...state,
        present: state.present.map(c => c.id === action.item.id ? action.item : c),
      };
    case 'SET':
      return {
        past: [...state.past.slice(-9), state.present],
        present: action.items,
      };
  }
}

// ── Tag helpers ──────────────────────────────────────────────────────────────

function withUpdatedTag(existing: CorrectionItem, updated: CorrectionItem): CorrectionItem {
  if (existing.tag !== 'unchanged') return { ...updated, tag: existing.tag };
  const bboxChanged =
    Math.round(existing.bbox.x1) !== Math.round(updated.bbox.x1) ||
    Math.round(existing.bbox.y1) !== Math.round(updated.bbox.y1) ||
    Math.round(existing.bbox.x2) !== Math.round(updated.bbox.x2) ||
    Math.round(existing.bbox.y2) !== Math.round(updated.bbox.y2);
  const classChanged = existing.class_id !== updated.class_id;
  return { ...updated, tag: (bboxChanged || classChanged) ? 'edited' : 'unchanged' };
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export default function CorrectAnnotationsPage() {
  const { detection_id } = useParams<{ detection_id: string }>();
  const t = useT();

  const [detection, setDetection] = useState<DetectionSummary | null>(null);
  const [modelFindings, setModelFindings] = useState<Finding[]>([]);
  const [defectTypes, setDefectTypes] = useState<DefectType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [mode, setMode] = useState<AnnotationMode>('draw');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [drawRect, setDrawRect] = useState<CorrectionItem['bbox'] | null>(null);

  const [historyState, dispatch] = useReducer(historyReducer, { past: [], present: [] });
  const corrections = historyState.present;
  const canUndo = historyState.past.length > 0;

  // Track which item is being drag-updated to avoid flooding undo stack
  const draggingIdRef = useRef<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const detailResp = await apiGet<DetectionDetail>(`/api/detections/${detection_id}`);
        const annotResp = await apiGet<AnnotationsResponse>(`/api/detections/${detection_id}/annotations`);

        let typesData: DefectType[] = [];
        try {
          const r = await fetch(`${API_BASE}/api/defect-types`, { credentials: 'include' });
          if (r.ok) typesData = await r.json();
        } catch { /* non-critical */ }

        setDetection(detailResp.detection);
        setModelFindings(annotResp.model_findings);
        setDefectTypes(typesData);

        let initialItems: CorrectionItem[];
        if (annotResp.correction) {
          // Match existing correction items back to model findings
          initialItems = annotResp.correction.findings.map(cf => {
            const match = annotResp.model_findings.find(f =>
              f.defect_type.id === cf.class_id &&
              Math.abs(f.bbox.x1 - cf.bbox_x1) < 3 &&
              Math.abs(f.bbox.y1 - cf.bbox_y1) < 3 &&
              Math.abs(f.bbox.x2 - cf.bbox_x2) < 3 &&
              Math.abs(f.bbox.y2 - cf.bbox_y2) < 3,
            );
            return {
              id: crypto.randomUUID(),
              class_id: cf.class_id,
              bbox: { x1: cf.bbox_x1, y1: cf.bbox_y1, x2: cf.bbox_x2, y2: cf.bbox_y2 },
              tag: (match ? 'unchanged' : 'new') as DiffTag,
              findingId: match ? String(match.id) : null,
            };
          });
        } else {
          initialItems = annotResp.model_findings.map(f => ({
            id: crypto.randomUUID(),
            class_id: f.defect_type.id,
            bbox: { ...f.bbox },
            tag: 'unchanged' as DiffTag,
            findingId: String(f.id),
          }));
        }

        dispatch({ type: 'RESET', items: initialItems });
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          setError(t.correct_not_found);
        } else if (err instanceof ApiError) {
          setError(err.message || `Server error ${err.status}`);
        } else {
          setError(t.correct_not_found);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detection_id]);

  // ── Mutation helpers ──────────────────────────────────────────────────────

  function handleAdd(item: CorrectionItem) {
    draggingIdRef.current = null;
    dispatch({ type: 'SET', items: [...corrections, item] });
    setSaved(false);
  }

  // Canvas drag: use UPDATE_ITEM (no undo push) while dragging same item;
  // commit to SET on first move of a new item to record pre-drag snapshot.
  function handleCanvasUpdate(item: CorrectionItem) {
    const existing = corrections.find(c => c.id === item.id);
    if (!existing) return;
    const updated = withUpdatedTag(existing, item);

    if (draggingIdRef.current === item.id) {
      dispatch({ type: 'UPDATE_ITEM', item: updated });
    } else {
      // First move of this item — push current state to undo, then update
      draggingIdRef.current = item.id;
      dispatch({ type: 'SET', items: corrections.map(c => c.id === item.id ? updated : c) });
    }
    setSaved(false);
  }

  function handleDragCommit() {
    // Called on mouseup/mouseleave — next drag of same item should record a new undo step
    draggingIdRef.current = null;
  }

  function handleDelete(id: string) {
    draggingIdRef.current = null;
    dispatch({ type: 'SET', items: corrections.filter(c => c.id !== id) });
    if (activeId === id) setActiveId(null);
    setSaved(false);
  }

  function handleRemoveFinding(findingId: string) {
    draggingIdRef.current = null;
    dispatch({ type: 'SET', items: corrections.filter(c => c.findingId !== findingId) });
    setSaved(false);
  }

  function handleRestoreFinding(finding: Finding) {
    draggingIdRef.current = null;
    const restored: CorrectionItem = {
      id: crypto.randomUUID(),
      class_id: finding.defect_type.id,
      bbox: { ...finding.bbox },
      tag: 'unchanged',
      findingId: String(finding.id),
    };
    dispatch({ type: 'SET', items: [...corrections, restored] });
    setSaved(false);
  }

  function handleCorrectionUpdate(item: CorrectionItem) {
    draggingIdRef.current = null;
    const existing = corrections.find(c => c.id === item.id);
    if (!existing) return;
    const updated = withUpdatedTag(existing, item);
    dispatch({ type: 'SET', items: corrections.map(c => c.id === item.id ? updated : c) });
    setSaved(false);
  }

  function handleUndo() {
    draggingIdRef.current = null;
    dispatch({ type: 'UNDO' });
    setSaved(false);
  }

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      const body: SaveBody = {
        findings: corrections.map(c => ({
          class_id: c.class_id,
          bbox_x1: Math.round(c.bbox.x1),
          bbox_y1: Math.round(c.bbox.y1),
          bbox_x2: Math.round(c.bbox.x2),
          bbox_y2: Math.round(c.bbox.y2),
        })),
      };
      await apiPost(`/api/detections/${detection_id}/annotations`, body);
      setSaved(true);
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : t.correct_save_error);
    } finally {
      setSaving(false);
    }
  }

  const classNames: Record<number, string> = {};
  for (const d of defectTypes) classNames[d.id] = t.defect_name(d.id, d.name);

  const imageUrl = detection?.image_path ? serverImageUrl(detection.image_path) : '';

  return (
    <ProtectedLayout>
      <style>{`
        .correct-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 360px;
          gap: 24px;
          align-items: start;
        }
        @media (max-width: 767px) {
          .correct-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div style={{ padding: 24, maxWidth: 1280, margin: '0 auto' }}>
        {/* Back link */}
        <Link
          href={`/detections/${detection_id}`}
          style={{
            fontFamily: "'Inter', sans-serif", fontSize: 13,
            color: 'var(--text-secondary)', textDecoration: 'none',
            display: 'inline-flex', alignItems: 'center', gap: 4,
            marginBottom: 20,
          }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--copper)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
        >
          {t.back_detection}
        </Link>

        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <h1 style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 22, fontWeight: 500,
            color: 'var(--text-primary)', margin: '0 0 4px',
          }}>
            {t.correct_title}
          </h1>
          {detection && (
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, fontFamily: "'Inter', sans-serif" }}>
              {t.correct_sub}
            </p>
          )}
        </div>

        {loading && (
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', fontFamily: "'Inter', sans-serif" }}>
            {t.correct_loading}
          </p>
        )}

        {error && (
          <p style={{ fontSize: 14, color: 'var(--red-fail)' }}>{error}</p>
        )}

        {!loading && !error && detection && (
          <>
            {/* Toolbar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              {(['draw', 'select'] as AnnotationMode[]).map(m => {
                const active = mode === m;
                const label = m === 'draw' ? t.annotate_mode_draw : t.annotate_mode_select;
                return (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    style={{
                      background: active ? 'var(--copper)' : 'transparent',
                      color: active ? '#0D0F0E' : 'var(--text-secondary)',
                      border: active ? 'none' : '0.5px solid var(--bg-border)',
                      borderRadius: 'var(--radius-md)', padding: '6px 14px',
                      fontSize: 13, fontWeight: 500, fontFamily: "'Inter', sans-serif",
                      cursor: 'pointer', transition: 'background 150ms ease, color 150ms ease',
                    }}
                    onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'var(--bg-elevated)'; e.currentTarget.style.color = 'var(--text-primary)'; } }}
                    onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; } }}
                  >
                    {label}
                  </button>
                );
              })}

              <span style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: "'Inter', sans-serif", marginLeft: 4 }}>
                {mode === 'draw' ? t.annotate_hint_draw : t.annotate_hint_select}
              </span>
            </div>

            <div className="correct-grid">
              {/* Canvas */}
              <div style={{
                border: '0.5px solid var(--bg-border)',
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden',
                background: 'var(--bg-surface)',
              }}>
                <AnnotationCanvas
                  imageUrl={imageUrl}
                  items={corrections}
                  activeId={activeId}
                  mode={mode}
                  drawRect={drawRect}
                  classNames={classNames}
                  onAdd={handleAdd}
                  onUpdate={handleCanvasUpdate}
                  onSelect={id => { handleDragCommit(); setActiveId(id); }}
                  onDrawRectChange={setDrawRect}
                />
              </div>

              {/* Correction list */}
              <CorrectionList
                modelFindings={modelFindings}
                corrections={corrections}
                activeId={activeId}
                defectTypes={defectTypes}
                onRemoveFinding={handleRemoveFinding}
                onRestoreFinding={handleRestoreFinding}
                onCorrectionSelect={setActiveId}
                onCorrectionUpdate={handleCorrectionUpdate}
                onCorrectionDelete={handleDelete}
                onSave={handleSave}
                onUndo={handleUndo}
                canUndo={canUndo}
                saving={saving}
                saved={saved}
                saveError={saveError}
              />
            </div>
          </>
        )}
      </div>
    </ProtectedLayout>
  );
}
