'use client';

import { useState, useEffect, useCallback } from 'react';
import ProtectedLayout from '@/components/layout/protected-layout';
import DetectionCard from '@/components/detections/detection-card';
import { DetectionSummary } from '@/lib/poll';
import { apiGet } from '@/lib/api';
import { useT } from '@/hooks/use-t';

interface DetectionListResponse {
  items: DetectionSummary[];
  total: number;
  pages: number;
  page: number;
}

export default function DetectionsPage() {
  const t = useT();
  const [data, setData] = useState<DetectionListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [defectiveOnly, setDefectiveOnly] = useState(false);
  const [source, setSource] = useState<'all' | 'ml' | 'manual'>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (defectiveOnly) params.set('defective_only', 'true');
      if (source !== 'all') params.set('source', source);
      if (fromDate) params.set('from', fromDate);
      if (toDate) params.set('to', toDate);
      const res = await apiGet<DetectionListResponse>(`/api/detections?${params}`);
      setData(res);
    } catch {
      setError(t.detections_error);
    } finally {
      setLoading(false);
    }
  }, [page, defectiveOnly, source, fromDate, toDate, t]);

  useEffect(() => { load(); }, [load]);

  const filterPill = (label: string, active: boolean, onClick: () => void) => (
    <button onClick={onClick} style={{
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 12,
      padding: '5px 14px',
      borderRadius: 99,
      border: '0.5px solid',
      borderColor: active ? 'var(--copper)' : 'var(--bg-border)',
      background: active ? 'rgba(200,121,65,0.12)' : 'transparent',
      color: active ? 'var(--copper)' : 'var(--text-secondary)',
      cursor: 'pointer',
    }}>{label}</button>
  );

  return (
    <ProtectedLayout>
      <div style={{ padding: '32px 24px', maxWidth: 1200, margin: '0 auto' }}>
        {/* filter bar */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 10,
          background: 'var(--bg-base)',
          padding: '12px 0',
          marginBottom: 24,
          display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap',
          borderBottom: '0.5px solid var(--bg-border)',
        }}>
          {filterPill(t.filter_all, !defectiveOnly, () => { setDefectiveOnly(false); setPage(1); })}
          {filterPill(t.filter_defective, defectiveOnly, () => { setDefectiveOnly(true); setPage(1); })}
          <div style={{ width: '0.5px', height: 16, background: 'var(--bg-border)', margin: '0 4px' }} />
          {filterPill(t.filter_ml, source === 'ml', () => { setSource(s => s === 'ml' ? 'all' : 'ml'); setPage(1); })}
          {filterPill(t.filter_annotated, source === 'manual', () => { setSource(s => s === 'manual' ? 'all' : 'manual'); setPage(1); })}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginLeft: 8 }}>
            <input
              type="date"
              value={fromDate}
              onChange={e => { setFromDate(e.target.value); setPage(1); }}
              style={dateInputStyle}
            />
            <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>—</span>
            <input
              type="date"
              value={toDate}
              onChange={e => { setToDate(e.target.value); setPage(1); }}
              style={dateInputStyle}
            />
            {(fromDate || toDate) && (
              <button onClick={() => { setFromDate(''); setToDate(''); setPage(1); }} style={{
                background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 12,
              }}>{t.filter_clear}</button>
            )}
          </div>
          {data && (
            <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--text-dim)' }}>
              {t.detections_count(data.total)}
            </span>
          )}
        </div>

        {error && (
          <p style={{ color: 'var(--red-fail)', fontSize: 14 }}>{error}</p>
        )}

        {loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 12 }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', background: 'var(--bg-surface)', border: '0.5px solid var(--bg-border)' }} aria-hidden="true">
                <div className="shimmer" style={{ paddingBottom: '56.25%' }} />
                <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div className="shimmer" style={{ height: 20, width: 70, borderRadius: 4 }} />
                  <div className="shimmer" style={{ height: 12, width: 90, borderRadius: 4 }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && data && data.items.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '80px 0', textAlign: 'center' }}>
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" opacity="0.2">
              <rect x="4" y="4" width="32" height="32" rx="4" stroke="var(--text-dim)" strokeWidth="1.5"/>
              <path d="M12 20h16M20 12v16" stroke="var(--text-dim)" strokeWidth="1.5"/>
            </svg>
            <p style={{ fontSize: 15, color: 'var(--text-secondary)', margin: 0 }}>
              {defectiveOnly || fromDate || toDate || source !== 'all' ? t.no_results_filters : t.no_inspections}
            </p>
            {(defectiveOnly || fromDate || toDate || source !== 'all') ? (
              <button onClick={() => { setDefectiveOnly(false); setFromDate(''); setToDate(''); setSource('all'); setPage(1); }}
                style={{ fontSize: 13, color: 'var(--copper)', background: 'none', border: 'none', cursor: 'pointer' }}>
                {t.clear_filters}
              </button>
            ) : (
              <a href="/detect" style={{ fontSize: 13, color: 'var(--copper)', textDecoration: 'none' }}>{t.inspect_link}</a>
            )}
          </div>
        )}

        {!loading && data && data.items.length > 0 && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 12 }}>
              {data.items.map(d => <DetectionCard key={d.id} d={d} />)}
            </div>

            {data.pages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 32, alignItems: 'center' }}>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  style={pageBtn(false, page === 1)}
                >{t.page_prev}</button>
                {Array.from({ length: data.pages }, (_, i) => i + 1)
                  .filter(p => Math.abs(p - page) <= 2 || p === 1 || p === data.pages)
                  .reduce<(number | '...')[]>((acc, p, i, arr) => {
                    if (i > 0 && (arr[i - 1] as number) + 1 < p) acc.push('...');
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, i) =>
                    p === '...' ? (
                      <span key={`e${i}`} style={{ color: 'var(--text-dim)', fontSize: 13 }}>…</span>
                    ) : (
                      <button key={p} onClick={() => setPage(p as number)} style={pageBtn(p === page, false)}>
                        {p}
                      </button>
                    )
                  )}
                <button
                  onClick={() => setPage(p => Math.min(data.pages, p + 1))}
                  disabled={page === data.pages}
                  style={pageBtn(false, page === data.pages)}
                >{t.page_next}</button>
              </div>
            )}
          </>
        )}
      </div>
    </ProtectedLayout>
  );
}

const dateInputStyle: React.CSSProperties = {
  background: 'var(--bg-surface)',
  border: '0.5px solid var(--bg-border)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--text-primary)',
  fontSize: 12,
  padding: '5px 10px',
  outline: 'none',
  fontFamily: "'JetBrains Mono', monospace",
};

function pageBtn(active: boolean, disabled: boolean): React.CSSProperties {
  return {
    fontFamily: "'Inter', sans-serif",
    fontSize: 13,
    padding: '5px 10px',
    borderRadius: 'var(--radius-md)',
    border: '0.5px solid var(--bg-border)',
    background: active ? 'rgba(200,121,65,0.12)' : 'transparent',
    color: active ? 'var(--copper)' : disabled ? 'var(--text-dim)' : 'var(--text-secondary)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.4 : 1,
  };
}
