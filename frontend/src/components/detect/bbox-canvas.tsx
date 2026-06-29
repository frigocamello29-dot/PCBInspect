'use client';

import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { Finding, DEFECT_COLORS } from '@/lib/poll';

interface BboxCanvasProps {
  imageUrl: string;
  findings: Finding[];
  activeFindingId: string | null;
  onFindingClick: (id: string) => void;
  showOverlay: boolean;
}

export interface BboxCanvasHandle {
  downloadAnnotated(filename?: string): void;
}

function drawBboxes(ctx: CanvasRenderingContext2D, findings: Finding[], activeFindingId: string | null, sx: number, sy: number) {
  for (const f of findings) {
    const { x1, y1, x2, y2 } = f.bbox;
    const color = DEFECT_COLORS[f.defect_type.id] ?? '#ffffff';
    const isActive = f.id === activeFindingId;
    const rx = x1 * sx, ry = y1 * sy;
    const rw = (x2 - x1) * sx, rh = (y2 - y1) * sy;
    ctx.fillStyle = color + (isActive ? '40' : '20');
    ctx.fillRect(rx, ry, rw, rh);
    ctx.strokeStyle = color;
    ctx.lineWidth = isActive ? 3 : 2;
    ctx.strokeRect(rx, ry, rw, rh);
    ctx.font = "11px 'JetBrains Mono', monospace";
    const label = f.defect_type.name;
    const lw = ctx.measureText(label).width + 8;
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(rx, ry - 18, lw, 17);
    ctx.fillStyle = color;
    ctx.fillText(label, rx + 4, ry - 4);
  }
}

const BboxCanvas = forwardRef<BboxCanvasHandle, BboxCanvasProps>(function BboxCanvas(
  { imageUrl, findings, activeFindingId, onFindingClick, showOverlay },
  ref
) {
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // keep latest values accessible in imperative handle without re-creating it
  const findingsRef = useRef(findings);
  findingsRef.current = findings;
  const activeRef = useRef(activeFindingId);
  activeRef.current = activeFindingId;

  useImperativeHandle(ref, () => ({
    downloadAnnotated(filename = 'annotated.png') {
      const img = imgRef.current;
      if (!img?.complete || !img.naturalWidth) return;
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      const off = document.createElement('canvas');
      off.width = w;
      off.height = h;
      const ctx = off.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      drawBboxes(ctx, findingsRef.current, activeRef.current, 1, 1);
      off.toBlob(blob => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      }, 'image/png');
    },
  }), []);

  useEffect(() => {
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) return;

    const draw = () => {
      if (!img.complete || img.naturalWidth === 0) return;
      const w = img.offsetWidth;
      const h = img.offsetHeight;
      if (!w || !h) return;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.clearRect(0, 0, w, h);
      if (!showOverlay) return;
      const sx = w / img.naturalWidth;
      const sy = h / img.naturalHeight;
      drawBboxes(ctx, findings, activeFindingId, sx, sy);
    };

    img.addEventListener('load', draw);
    const ro = new ResizeObserver(draw);
    ro.observe(img);
    draw();
    return () => {
      img.removeEventListener('load', draw);
      ro.disconnect();
    };
  }, [findings, activeFindingId, showOverlay, imageUrl]);

  function handleCanvasClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const img = imgRef.current;
    if (!img || !img.complete || !img.naturalWidth) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - rect.left) * (img.naturalWidth / img.offsetWidth);
    const ny = (e.clientY - rect.top) * (img.naturalHeight / img.offsetHeight);
    for (const f of findings) {
      const { x1, y1, x2, y2 } = f.bbox;
      if (nx >= x1 && nx <= x2 && ny >= y1 && ny <= y2) {
        onFindingClick(f.id);
        return;
      }
    }
  }

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src={imageUrl}
        alt="PCB image"
        style={{ display: 'block', width: '100%', borderRadius: 'var(--radius-md)' }}
      />
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          borderRadius: 'var(--radius-md)',
          cursor: findings.length > 0 ? 'crosshair' : 'default',
          opacity: showOverlay ? 1 : 0,
          transition: 'opacity 150ms ease',
          pointerEvents: showOverlay && findings.length > 0 ? 'auto' : 'none',
        }}
      />
    </div>
  );
});

export default BboxCanvas;
