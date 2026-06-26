'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import ProtectedLayout from '@/components/layout/protected-layout';
import BboxCanvas from '@/components/detect/bbox-canvas';
import { DetectionSummary, Finding, serverImageUrl, DEFECT_COLORS } from '@/lib/poll';
import { apiGet, apiDelete } from '@/lib/api';

interface DetectionDetail {
  detection: DetectionSummary;
  findings: Finding[];
}

const SEVERITY_COLORS: Record<string, string> = {
  low: '#22C55E',
  medium: '#F59E0B',
  high: '#EF4444',
  critical: '#DC2626',
};

function StatusBadge({ d }: { d: DetectionSummary }) {
  let label = d.status.toUpperCase();
  let color = '#8A9189';
  let bg = 'rgba(138,145,137,0.12)';
  if (d.status === 'completed') {
    if (!d.is_defective) { label = 'PASS'; color = '#22C55E'; bg = 'rgba(34,197,94,0.12)'; }
    else { label = `${d.defect_count} DEFECT${d.defect_count !== 1 ? 'S' : ''}`; color = '#EF4444'; bg = 'rgba(239,68,68,0.12)'; }
  }
  return (
    <span style={{
      fontFamily: "'JetBrains Mono', monospace", fontSize: 16, fontWeight: 500,
      letterSpacing: '0.05em', color, background: bg,
      padding: '4px 12px', borderRadius: 'var(--radius-sm)',
    }}>{label}</span>
  );
}

export default function DetectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [data, setData] = useState<DetectionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showOverlay, setShowOverlay] = useState(true);
  const [activeFindingId, setActiveFindingId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    apiGet<DetectionDetail>(`/api/detections/${id}`)
      .then(setData)
      .catch(() => setError('Detection not found.'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await apiDelete(`/api/detections/${id}`);
      router.push('/detections');
    } catch {
      setDeleting(false);
      setShowDeleteDialog(false);
      setError('Failed to delete.');
    }
  };

  const det = data?.detection;
  const findings = data?.findings ?? [];

  return (
    <ProtectedLayout>
      <style>{`
        .detail-grid {
          display: grid;
          grid-template-columns: minmax(0,1fr) 380px;
          gap: 24px;
        }
        @media (max-width: 767px) {
          .detail-grid { grid-template-columns: 1fr; }
        }
      `}</style>
      <div style={{ padding: '24px', maxWidth: 1200, margin: '0 auto' }}>
        <Link href="/detections" style={{
          fontFamily: "'Inter', sans-serif", fontSize: 13, color: 'var(--text-secondary)',
          textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 24,
        }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--copper)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
        >← History</Link>

        {loading && (
          <div className="detail-grid" aria-hidden="true">
            <div className="shimmer" style={{ borderRadius: 'var(--radius-lg)', minHeight: 400 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="shimmer" style={{ height: 48, borderRadius: 'var(--radius-lg)' }} />
              <div className="shimmer" style={{ height: 96, borderRadius: 'var(--radius-lg)' }} />
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="shimmer" style={{ height: 80, borderRadius: 'var(--radius-lg)' }} />
              ))}
            </div>
          </div>
        )}

        {error && <p style={{ color: 'var(--red-fail)', fontSize: 14 }}>{error}</p>}

        {det && (
          <div className="detail-grid">
            {/* image viewer */}
            <div style={{ background: 'var(--bg-surface)', border: '0.5px solid var(--bg-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '8px 12px', borderBottom: '0.5px solid var(--bg-border)', gap: 6 }}>
                {['Original', 'Annotated'].map(v => (
                  <button key={v} onClick={() => setShowOverlay(v === 'Annotated')} style={{
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 11, padding: '4px 10px',
                    borderRadius: 'var(--radius-sm)', border: '0.5px solid var(--bg-border)',
                    background: (v === 'Annotated') === showOverlay ? 'rgba(200,121,65,0.12)' : 'transparent',
                    color: (v === 'Annotated') === showOverlay ? 'var(--copper)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                  }}>{v}</button>
                ))}
              </div>
              <div style={{ padding: 16 }}>
                {det.image_path && (
                  <BboxCanvas
                    imageUrl={serverImageUrl(det.image_path)}
                    findings={findings}
                    activeFindingId={activeFindingId}
                    onFindingClick={setActiveFindingId}
                    showOverlay={showOverlay}
                  />
                )}
              </div>
            </div>

            {/* detail panel */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ background: 'var(--bg-surface)', border: '0.5px solid var(--bg-border)', borderRadius: 'var(--radius-lg)', padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <StatusBadge d={det} />
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: 'var(--text-dim)' }}>
                    {new Date(det.created_at).toLocaleString()}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', marginBottom: 16 }}>
                  {[
                    ['Model', det.model_version ?? '—'],
                    ['Inference', det.inference_time_ms != null ? `${det.inference_time_ms}ms` : '—'],
                    ['Defects', String(det.defect_count)],
                    ['Status', det.status],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <div style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: "'JetBrains Mono', monospace", marginBottom: 2 }}>{k}</div>
                      <div style={{ fontSize: 13, color: 'var(--text-primary)', fontFamily: "'JetBrains Mono', monospace" }}>{v}</div>
                    </div>
                  ))}
                </div>

                {det.error_message && (
                  <p style={{ fontSize: 12, color: 'var(--red-fail)', margin: '0 0 12px', background: 'rgba(239,68,68,0.08)', padding: 8, borderRadius: 6 }}>
                    {det.error_message}
                  </p>
                )}
              </div>

              {/* findings */}
              {findings.length > 0 && (
                <div style={{ background: 'var(--bg-surface)', border: '0.5px solid var(--bg-border)', borderRadius: 'var(--radius-lg)', padding: 16 }}>
                  <p style={{ fontSize: 12, color: 'var(--text-dim)', fontFamily: "'JetBrains Mono', monospace", margin: '0 0 12px', letterSpacing: '0.05em' }}>
                    FINDINGS
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {findings.map(f => {
                      const active = activeFindingId === f.id;
                      const clr = DEFECT_COLORS[f.defect_type.id] ?? '#8A9189';
                      const sevClr = SEVERITY_COLORS[f.defect_type.severity] ?? '#8A9189';
                      return (
                        <div
                          key={f.id}
                          onClick={() => setActiveFindingId(active ? null : f.id)}
                          style={{
                            borderLeft: `3px solid ${active ? clr : 'transparent'}`,
                            borderRadius: 6,
                            padding: '10px 10px 10px 12px',
                            background: active ? 'var(--bg-elevated)' : 'transparent',
                            cursor: 'pointer',
                            border: `0.5px solid var(--bg-border)`,
                            borderLeftWidth: active ? 3 : 0.5,
                            borderLeftColor: active ? clr : 'var(--bg-border)',
                            transition: 'background 100ms ease',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{f.defect_type.name}</span>
                            <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: sevClr, background: `${sevClr}18`, padding: '2px 6px', borderRadius: 4 }}>
                              {f.defect_type.severity}
                            </span>
                          </div>
                          <div style={{ marginBottom: 6 }}>
                            <div style={{ height: 4, background: 'var(--bg-border)', borderRadius: 2, overflow: 'hidden' }}>
                              <div style={{ width: `${Math.round(f.confidence * 100)}%`, height: '100%', background: clr, borderRadius: 2 }} />
                            </div>
                            <span style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: "'JetBrains Mono', monospace" }}>
                              {Math.round(f.confidence * 100)}% confidence
                            </span>
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: "'JetBrains Mono', monospace" }}>
                            x1:{f.bbox.x1} y1:{f.bbox.y1} x2:{f.bbox.x2} y2:{f.bbox.y2}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* actions */}
              <div style={{ display: 'flex', gap: 8 }}>
                <a
                  href={serverImageUrl(det.image_path)}
                  download
                  style={{
                    flex: 1, textAlign: 'center', padding: '10px 0',
                    background: 'var(--copper)', color: '#0D0F0E',
                    fontFamily: "'Inter', sans-serif", fontWeight: 500, fontSize: 14,
                    borderRadius: 'var(--radius-md)', textDecoration: 'none',
                    border: 'none', cursor: 'pointer',
                  }}
                >Download image</a>
                <button
                  onClick={() => setShowDeleteDialog(true)}
                  style={{
                    flex: 1, padding: '10px 0',
                    background: 'transparent', color: 'var(--red-fail)',
                    fontFamily: "'Inter', sans-serif", fontWeight: 500, fontSize: 14,
                    borderRadius: 'var(--radius-md)',
                    border: '0.5px solid rgba(239,68,68,0.3)', cursor: 'pointer',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >Delete</button>
              </div>
            </div>
          </div>
        )}

        {/* delete dialog */}
        {showDeleteDialog && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
          }}>
            <div style={{
              width: 400, background: 'var(--bg-elevated)',
              border: '0.5px solid var(--bg-border)', borderRadius: 'var(--radius-xl)',
              padding: 28, boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            }}>
              <h2 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 18, color: 'var(--text-primary)', margin: '0 0 8px' }}>
                Delete this detection?
              </h2>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '0 0 24px' }}>
                Can&apos;t be undone. The image and all findings will be permanently removed.
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => setShowDeleteDialog(false)}
                  disabled={deleting}
                  style={{
                    flex: 1, padding: '10px 0', background: 'transparent',
                    color: 'var(--text-secondary)', border: '0.5px solid var(--bg-border)',
                    borderRadius: 'var(--radius-md)', cursor: 'pointer', fontSize: 14,
                  }}
                >Cancel</button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  style={{
                    flex: 1, padding: '10px 0', background: 'var(--red-fail)',
                    color: '#fff', border: 'none',
                    borderRadius: 'var(--radius-md)', cursor: deleting ? 'not-allowed' : 'pointer', fontSize: 14,
                    opacity: deleting ? 0.6 : 1,
                  }}
                >{deleting ? 'Deleting…' : 'Delete'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedLayout>
  );
}
