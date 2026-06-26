'use client';

import { useEffect, useState } from 'react';
import ProtectedLayout from '@/components/layout/protected-layout';
import UploadZone from '@/components/detect/upload-zone';
import AnnotateCanvas, { Annotation, AnnotationMode } from '@/components/annotate/annotate-canvas';
import AnnotationList from '@/components/annotate/annotation-list';
import { apiPost, apiUploadFile, ApiError } from '@/lib/api';

interface DefectType {
  id: number;
  name: string;
  severity: string;
  description: string;
}

interface UploadImageResponse {
  image_path: string;
  thumbnail_path: string;
}

interface AnnotateResponse {
  detection: { id: string };
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export default function AnnotatePage() {
  const [defectTypes, setDefectTypes] = useState<DefectType[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);  // object URL for canvas
  const [imagePath, setImagePath] = useState<string | null>(null);    // server-side path
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mode, setMode] = useState<AnnotationMode>('draw');
  const [drawRect, setDrawRect] = useState<Annotation['bbox'] | null>(null);

  const [saving, setSaving] = useState(false);
  const [savedDetectionId, setSavedDetectionId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/defect-types`, { credentials: 'include' })
      .then((r) => r.json())
      .then(setDefectTypes)
      .catch(() => {});
  }, []);

  async function handleFile(f: File) {
    const objUrl = URL.createObjectURL(f);
    setFile(f);
    setPreviewUrl(objUrl);
    setImagePath(null);
    setAnnotations([]);
    setActiveId(null);
    setMode('draw');
    setSavedDetectionId(null);
    setSaveError(null);
    setUploadError(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', f);
      const resp = await apiUploadFile<UploadImageResponse>('/api/annotate/upload', form);
      setImagePath(resp.image_path);
    } catch (err) {
      setUploadError(err instanceof ApiError ? err.message : 'Upload failed. Try uploading again.');
      setPreviewUrl(null);
      setFile(null);
    } finally {
      setUploading(false);
    }
  }

  function handleClear() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setImagePath(null);
    setAnnotations([]);
    setActiveId(null);
    setMode('draw');
    setSavedDetectionId(null);
    setSaveError(null);
    setUploadError(null);
  }

  function handleAdd(ann: Annotation) {
    setAnnotations((prev) => [...prev, ann]);
  }

  function handleUpdate(ann: Annotation) {
    setAnnotations((prev) => prev.map((a) => (a.id === ann.id ? ann : a)));
  }

  function handleDelete(id: string) {
    setAnnotations((prev) => prev.filter((a) => a.id !== id));
    if (activeId === id) setActiveId(null);
  }

  async function handleSave() {
    if (!imagePath || annotations.length === 0 || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      const resp = await apiPost<AnnotateResponse>('/api/annotate', {
        image_path: imagePath,
        annotations: annotations.map((a) => ({
          class_id: a.class_id,
          confidence: a.confidence,
          bbox: { x1: Math.round(a.bbox.x1), y1: Math.round(a.bbox.y1), x2: Math.round(a.bbox.x2), y2: Math.round(a.bbox.y2) },
        })),
      });
      setSavedDetectionId(resp.detection.id);
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : 'Save failed. Try again.');
    } finally {
      setSaving(false);
    }
  }

  const imageReady = !!imagePath && !uploading;

  return (
    <ProtectedLayout>
      <style>{`
        .annotate-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          align-items: start;
        }
        @media (max-width: 767px) {
          .annotate-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div style={{ padding: 24, maxWidth: 1280, margin: '0 auto' }}>
        {/* Page title */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 22, fontWeight: 500,
            color: 'var(--text-primary)',
            margin: '0 0 4px',
          }}>
            Annotate
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, fontFamily: "'Inter', sans-serif" }}>
            Upload a PCB image, draw bounding boxes, and save annotations to history.
          </p>
        </div>

        <div className="annotate-grid">
          {/* Left — upload zone or canvas */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {!previewUrl || uploading ? (
              <>
                <UploadZone
                  file={file}
                  previewUrl={null}
                  disabled={uploading}
                  onFile={handleFile}
                  onClear={handleClear}
                  onCameraOpen={() => {}}
                />
                {uploading && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0' }}>
                    <span style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 12, color: 'var(--copper)',
                    }}>
                      Uploading…
                    </span>
                  </div>
                )}
                {uploadError && (
                  <div style={{
                    background: '#EF444418',
                    border: '0.5px solid #EF444440',
                    borderRadius: 'var(--radius-md)',
                    padding: '10px 14px',
                    fontSize: 13, color: 'var(--red-fail)',
                    fontFamily: "'Inter', sans-serif",
                  }}>
                    {uploadError}
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Toolbar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {(['draw', 'select'] as AnnotationMode[]).map((m) => {
                    const active = mode === m;
                    return (
                      <button
                        key={m}
                        onClick={() => setMode(m)}
                        style={{
                          background: active ? 'var(--copper)' : 'transparent',
                          color: active ? '#0D0F0E' : 'var(--text-secondary)',
                          border: active ? 'none' : '0.5px solid var(--bg-border)',
                          borderRadius: 'var(--radius-md)',
                          padding: '6px 14px',
                          fontSize: 13, fontWeight: 500,
                          fontFamily: "'Inter', sans-serif",
                          cursor: 'pointer',
                          textTransform: 'capitalize',
                          transition: 'background 150ms ease, color 150ms ease',
                        }}
                        onMouseEnter={(e) => {
                          if (!active) {
                            e.currentTarget.style.background = 'var(--bg-elevated)';
                            e.currentTarget.style.color = 'var(--text-primary)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!active) {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = 'var(--text-secondary)';
                          }
                        }}
                      >
                        {m}
                      </button>
                    );
                  })}

                  <button
                    onClick={() => { setAnnotations([]); setActiveId(null); }}
                    disabled={annotations.length === 0}
                    style={{
                      background: 'transparent',
                      color: annotations.length === 0 ? 'var(--text-dim)' : 'var(--red-fail)',
                      border: `0.5px solid ${annotations.length === 0 ? 'var(--bg-border)' : 'rgba(239,68,68,0.3)'}`,
                      borderRadius: 'var(--radius-md)',
                      padding: '6px 14px',
                      fontSize: 13, fontWeight: 500,
                      fontFamily: "'Inter', sans-serif",
                      cursor: annotations.length === 0 ? 'not-allowed' : 'pointer',
                      marginLeft: 'auto',
                      transition: 'background 150ms ease',
                    }}
                    onMouseEnter={(e) => {
                      if (annotations.length > 0) e.currentTarget.style.background = 'rgba(239,68,68,0.08)';
                    }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    Clear all
                  </button>

                  <button
                    onClick={handleClear}
                    title="Remove image and start over"
                    style={{
                      background: 'transparent',
                      color: 'var(--text-secondary)',
                      border: '0.5px solid var(--bg-border)',
                      borderRadius: 'var(--radius-md)',
                      padding: '6px 12px',
                      fontSize: 13,
                      fontFamily: "'Inter', sans-serif",
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--bg-elevated)';
                      e.currentTarget.style.color = 'var(--text-primary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'var(--text-secondary)';
                    }}
                  >
                    Change image
                  </button>
                </div>

                {/* Canvas */}
                <div style={{
                  border: '0.5px solid var(--bg-border)',
                  borderRadius: 'var(--radius-lg)',
                  overflow: 'hidden',
                  background: 'var(--bg-surface)',
                }}>
                  <AnnotateCanvas
                    imageUrl={previewUrl}
                    annotations={annotations}
                    activeId={activeId}
                    mode={mode}
                    drawRect={drawRect}
                    onAdd={handleAdd}
                    onUpdate={handleUpdate}
                    onSelect={setActiveId}
                    onDrawRectChange={setDrawRect}
                  />
                </div>

                {/* Mode hint */}
                <p style={{ fontSize: 11, color: 'var(--text-dim)', margin: 0, fontFamily: "'Inter', sans-serif" }}>
                  {mode === 'draw'
                    ? 'Click and drag on the image to draw a bounding box.'
                    : 'Click a box to select it. Drag to move. Drag corner/edge handles to resize.'}
                </p>
              </>
            )}
          </div>

          {/* Right — annotation list */}
          <div>
            <AnnotationList
              annotations={annotations}
              activeId={activeId}
              defectTypes={defectTypes}
              onSelect={setActiveId}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              onSave={handleSave}
              saving={saving}
              savedDetectionId={savedDetectionId}
              imageReady={imageReady}
            />
            {saveError && (
              <div style={{
                marginTop: 12,
                background: '#EF444418',
                border: '0.5px solid #EF444440',
                borderRadius: 'var(--radius-md)',
                padding: '10px 14px',
                fontSize: 13, color: 'var(--red-fail)',
                fontFamily: "'Inter', sans-serif",
              }}>
                {saveError}
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedLayout>
  );
}
