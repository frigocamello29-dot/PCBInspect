'use client';

import { useState, useEffect } from 'react';
import ProtectedLayout from '@/components/layout/protected-layout';
import UploadZone from '@/components/detect/upload-zone';
import CameraCapture from '@/components/detect/camera-capture';
import ResultsPanel from '@/components/detect/results-panel';
import { apiUploadFile, ApiError } from '@/lib/api';
import { pollStatus, StatusResponse } from '@/lib/poll';
import { useT } from '@/hooks/use-t';

type Phase = 'idle' | 'uploading' | 'analyzing' | 'done' | 'error';

export default function DetectPage() {
  const t = useT();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [detectionId, setDetectionId] = useState<string | null>(null);
  const [pollResult, setPollResult] = useState<StatusResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeFindingId, setActiveFindingId] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  function selectFile(f: File) {
    setPreviewUrl(prev => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(f); });
    setFile(f);
    setPhase('idle');
    setPollResult(null);
    setDetectionId(null);
    setErrorMsg(null);
    setActiveFindingId(null);
  }

  function clearFile() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setPhase('idle');
    setPollResult(null);
    setDetectionId(null);
    setErrorMsg(null);
    setActiveFindingId(null);
  }

  function handleCameraCapture(blob: Blob) {
    setShowCamera(false);
    selectFile(new File([blob], 'capture.jpg', { type: 'image/jpeg' }));
  }

  async function handleAnalyze() {
    if (!file || phase === 'uploading' || phase === 'analyzing') return;
    setPhase('uploading');
    setErrorMsg(null);
    setPollResult(null);
    setActiveFindingId(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const resp = await apiUploadFile<{ detection_id: string; job_id: string | null; status: string }>(
        '/api/detect', form
      );
      setDetectionId(resp.detection_id);
      setPhase('analyzing');
    } catch (err) {
      setErrorMsg(err instanceof ApiError ? err.message : t.upload_failed);
      setPhase('error');
    }
  }

  // polling loop
  useEffect(() => {
    if (phase !== 'analyzing' || !detectionId) return;
    const ctrl = new AbortController();
    let tid: ReturnType<typeof setTimeout>;
    let interval = 1000;

    async function poll() {
      try {
        const result = await pollStatus(detectionId!, ctrl.signal);
        if (result.status === 'completed') {
          setPollResult(result);
          setPhase('done');
          return;
        }
        if (result.status === 'failed') {
          setPollResult(result);
          setErrorMsg(result.detection?.error_message ?? t.results_error_generic);
          setPhase('error');
          return;
        }
        tid = setTimeout(poll, interval);
        interval = Math.min(Math.floor(interval * 1.3), 5000);
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        setErrorMsg(t.results_error_generic);
        setPhase('error');
      }
    }

    poll();
    return () => { ctrl.abort(); clearTimeout(tid); };
  }, [phase, detectionId]);

  // elapsed timer
  useEffect(() => {
    if (phase !== 'analyzing') { setElapsed(0); return; }
    setElapsed(0);
    const id = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(id);
  }, [phase]);

  const busy = phase === 'uploading' || phase === 'analyzing';
  const panelPhase = (phase === 'uploading' || phase === 'analyzing')
    ? 'analyzing'
    : phase === 'done' ? 'done'
    : phase === 'error' ? 'error'
    : 'idle';

  return (
    <ProtectedLayout>
      <style>{`
        .detect-grid {
          display: grid;
          grid-template-columns: 2fr 3fr;
          gap: 24px;
          align-items: start;
        }
        @media (max-width: 767px) {
          .detect-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      {showCamera && (
        <CameraCapture onCapture={handleCameraCapture} onClose={() => setShowCamera(false)} />
      )}

      <div style={{ padding: 24, maxWidth: 1280, margin: '0 auto' }}>
        <div className="detect-grid">
          {/* left — upload */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <UploadZone
              file={file}
              previewUrl={previewUrl}
              disabled={busy}
              onFile={selectFile}
              onClear={clearFile}
              onCameraOpen={() => setShowCamera(true)}
            />
            {file && (
              <button
                onClick={handleAnalyze}
                disabled={busy}
                style={{
                  background: busy ? 'var(--bg-border)' : 'var(--copper)',
                  color: busy ? 'var(--text-dim)' : '#0D0F0E',
                  border: 'none', borderRadius: 'var(--radius-md)',
                  padding: '12px 24px', fontSize: 14, fontWeight: 500,
                  fontFamily: "'Inter', sans-serif",
                  cursor: busy ? 'not-allowed' : 'pointer',
                  width: '100%', transition: 'background 150ms ease',
                }}
                onMouseEnter={e => { if (!busy) e.currentTarget.style.background = 'var(--copper-muted)'; }}
                onMouseLeave={e => { if (!busy) e.currentTarget.style.background = 'var(--copper)'; }}
              >
                {phase === 'uploading' ? t.uploading : phase === 'analyzing' ? t.analyzing : t.analyze_button}
              </button>
            )}
          </div>

          {/* right — results */}
          <ResultsPanel
            phase={panelPhase}
            pollResult={pollResult}
            errorMsg={errorMsg}
            activeFindingId={activeFindingId}
            elapsed={elapsed}
            onFindingClick={setActiveFindingId}
          />
        </div>
      </div>
    </ProtectedLayout>
  );
}
