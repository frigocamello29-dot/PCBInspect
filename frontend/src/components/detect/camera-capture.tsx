'use client';

import { useEffect, useRef, useState } from 'react';

interface CameraCaptureProps {
  onCapture: (blob: Blob) => void;
  onClose: () => void;
}

export default function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => setReady(true);
        }
      } catch {
        setError('Camera not available. Check browser permissions.');
      }
    }
    start();
    return () => { streamRef.current?.getTracks().forEach(t => t.stop()); };
  }, []);

  function capture() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')!.drawImage(video, 0, 0);
    canvas.toBlob(blob => {
      if (blob) {
        streamRef.current?.getTracks().forEach(t => t.stop());
        onCapture(blob);
      }
    }, 'image/jpeg', 0.92);
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 100, padding: 24,
    }}>
      <div style={{
        background: 'var(--bg-surface)',
        border: '0.5px solid var(--bg-border)',
        borderRadius: 'var(--radius-xl)',
        overflow: 'hidden', width: '100%', maxWidth: 560,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px', borderBottom: '0.5px solid var(--bg-border)',
        }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: 'var(--text-primary)' }}>
            Camera capture
          </span>
          <button
            onClick={onClose}
            style={{
              background: 'transparent', color: 'var(--text-secondary)',
              border: 'none', fontSize: 20, cursor: 'pointer', lineHeight: 1, padding: '0 4px',
            }}
          >×</button>
        </div>

        <div style={{ background: '#000', minHeight: 240, position: 'relative' }}>
          {error ? (
            <div style={{
              minHeight: 240, display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--red-fail)', fontSize: 13, padding: 24, textAlign: 'center',
            }}>
              {error}
            </div>
          ) : (
            <video ref={videoRef} autoPlay playsInline muted
              style={{ width: '100%', display: 'block', maxHeight: 400 }} />
          )}
          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>

        {!error && (
          <div style={{ padding: 16, display: 'flex', justifyContent: 'center', gap: 10 }}>
            <button
              onClick={onClose}
              style={{
                background: 'transparent', color: 'var(--text-secondary)',
                border: '0.5px solid var(--bg-border)', borderRadius: 'var(--radius-md)',
                padding: '10px 20px', fontSize: 14, fontFamily: "'Inter', sans-serif", cursor: 'pointer',
              }}
            >Cancel</button>
            <button
              onClick={capture}
              disabled={!ready}
              style={{
                background: ready ? 'var(--copper)' : 'var(--bg-border)',
                color: ready ? '#0D0F0E' : 'var(--text-dim)',
                border: 'none', borderRadius: 'var(--radius-md)',
                padding: '10px 24px', fontSize: 14, fontWeight: 500,
                fontFamily: "'Inter', sans-serif", cursor: ready ? 'pointer' : 'not-allowed',
              }}
            >Capture</button>
          </div>
        )}
      </div>
    </div>
  );
}
