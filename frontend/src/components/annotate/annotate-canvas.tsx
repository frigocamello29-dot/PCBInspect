'use client';

import { useEffect, useRef } from 'react';
import { DEFECT_COLORS } from '@/lib/poll';

export interface Annotation {
  id: string;
  class_id: number;
  confidence: number;
  bbox: { x1: number; y1: number; x2: number; y2: number };
}

export type AnnotationMode = 'draw' | 'select';

type HandleType = 'tl' | 'tm' | 'tr' | 'ml' | 'mr' | 'bl' | 'bm' | 'br';

const HS = 5; // half-size of resize handle in canvas px

interface Props {
  imageUrl: string;
  annotations: Annotation[];
  activeId: string | null;
  mode: AnnotationMode;
  drawRect: { x1: number; y1: number; x2: number; y2: number } | null;
  onAdd: (ann: Annotation) => void;
  onUpdate: (ann: Annotation) => void;
  onSelect: (id: string | null) => void;
  onDrawRectChange: (r: { x1: number; y1: number; x2: number; y2: number } | null) => void;
}

function getScales(img: HTMLImageElement) {
  return {
    sx: img.offsetWidth / img.naturalWidth,
    sy: img.offsetHeight / img.naturalHeight,
  };
}

function toImg(canvasX: number, canvasY: number, img: HTMLImageElement) {
  const { sx, sy } = getScales(img);
  return { x: canvasX / sx, y: canvasY / sy };
}

function getHandlePositions(
  bbox: Annotation['bbox'],
  sx: number,
  sy: number,
): Record<HandleType, [number, number]> {
  const { x1, y1, x2, y2 } = bbox;
  const cx = (x1 + x2) / 2;
  const cy = (y1 + y2) / 2;
  return {
    tl: [x1 * sx, y1 * sy],
    tm: [cx * sx, y1 * sy],
    tr: [x2 * sx, y1 * sy],
    ml: [x1 * sx, cy * sy],
    mr: [x2 * sx, cy * sy],
    bl: [x1 * sx, y2 * sy],
    bm: [cx * sx, y2 * sy],
    br: [x2 * sx, y2 * sy],
  };
}

function hitHandle(
  bbox: Annotation['bbox'],
  cx: number,
  cy: number,
  sx: number,
  sy: number,
): HandleType | null {
  const handles = getHandlePositions(bbox, sx, sy);
  for (const [type, [hx, hy]] of Object.entries(handles) as [HandleType, [number, number]][]) {
    if (Math.abs(cx - hx) <= HS + 3 && Math.abs(cy - hy) <= HS + 3) return type;
  }
  return null;
}

function hitAnnotation(
  annotations: Annotation[],
  cx: number,
  cy: number,
  sx: number,
  sy: number,
): string | null {
  for (let i = annotations.length - 1; i >= 0; i--) {
    const { id, bbox } = annotations[i];
    if (cx >= bbox.x1 * sx && cx <= bbox.x2 * sx && cy >= bbox.y1 * sy && cy <= bbox.y2 * sy) {
      return id;
    }
  }
  return null;
}

function applyResize(
  orig: Annotation['bbox'],
  handle: HandleType,
  dx: number,
  dy: number,
  natW: number,
  natH: number,
): Annotation['bbox'] {
  let { x1, y1, x2, y2 } = orig;
  if (handle[0] === 't') y1 += dy;
  if (handle[0] === 'b') y2 += dy;
  if (handle[1] === 'l') x1 += dx;
  if (handle[1] === 'r') x2 += dx;
  x1 = Math.max(0, Math.min(x1, natW));
  x2 = Math.max(0, Math.min(x2, natW));
  y1 = Math.max(0, Math.min(y1, natH));
  y2 = Math.max(0, Math.min(y2, natH));
  return { x1: Math.min(x1, x2), y1: Math.min(y1, y2), x2: Math.max(x1, x2), y2: Math.max(y1, y2) };
}

function clampBbox(
  bbox: Annotation['bbox'],
  natW: number,
  natH: number,
): Annotation['bbox'] {
  return {
    x1: Math.max(0, Math.min(bbox.x1, natW)),
    y1: Math.max(0, Math.min(bbox.y1, natH)),
    x2: Math.max(0, Math.min(bbox.x2, natW)),
    y2: Math.max(0, Math.min(bbox.y2, natH)),
  };
}

export default function AnnotateCanvas({
  imageUrl, annotations, activeId, mode, drawRect,
  onAdd, onUpdate, onSelect, onDrawRectChange,
}: Props) {
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Refs for drag state — avoid stale closures
  const drawingRef = useRef<{ start: { x: number; y: number } } | null>(null);
  const resizingRef = useRef<{
    ann: Annotation;
    handle: HandleType;
    startImgPt: { x: number; y: number };
  } | null>(null);
  const movingRef = useRef<{
    ann: Annotation;
    startImgPt: { x: number; y: number };
  } | null>(null);

  // Canvas draw
  useEffect(() => {
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) return;

    const draw = () => {
      if (!img.complete || !img.naturalWidth) return;
      const w = img.offsetWidth;
      const h = img.offsetHeight;
      if (!w || !h) return;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.clearRect(0, 0, w, h);
      const sx = w / img.naturalWidth;
      const sy = h / img.naturalHeight;

      // Draw annotations
      for (let i = 0; i < annotations.length; i++) {
        const ann = annotations[i];
        const { x1, y1, x2, y2 } = ann.bbox;
        const color = DEFECT_COLORS[ann.class_id] ?? '#ffffff';
        const isActive = ann.id === activeId;
        const rx = x1 * sx, ry = y1 * sy;
        const rw = (x2 - x1) * sx, rh = (y2 - y1) * sy;

        ctx.fillStyle = color + (isActive ? '40' : '20');
        ctx.fillRect(rx, ry, rw, rh);
        ctx.strokeStyle = color;
        ctx.lineWidth = isActive ? 2.5 : 1.5;
        ctx.strokeRect(rx, ry, rw, rh);

        // Index label pill
        const label = `#${i + 1}`;
        ctx.font = "11px 'JetBrains Mono', monospace";
        const lw = ctx.measureText(label).width + 8;
        ctx.fillStyle = 'rgba(0,0,0,0.75)';
        ctx.fillRect(rx, ry - 18, lw, 17);
        ctx.fillStyle = color;
        ctx.fillText(label, rx + 4, ry - 4);

        // Resize handles on active annotation (select mode)
        if (isActive && mode === 'select') {
          const handles = getHandlePositions(ann.bbox, sx, sy);
          ctx.fillStyle = color;
          ctx.strokeStyle = '#0D0F0E';
          ctx.lineWidth = 1;
          for (const [, [hx, hy]] of Object.entries(handles)) {
            ctx.fillRect(hx - HS, hy - HS, HS * 2, HS * 2);
            ctx.strokeRect(hx - HS, hy - HS, HS * 2, HS * 2);
          }
        }
      }

      // In-progress draw rect
      if (drawRect) {
        const { x1, y1, x2, y2 } = drawRect;
        ctx.save();
        ctx.strokeStyle = '#C87941';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 3]);
        ctx.strokeRect(x1 * sx, y1 * sy, (x2 - x1) * sx, (y2 - y1) * sy);
        ctx.restore();
        ctx.fillStyle = '#C8794120';
        ctx.fillRect(x1 * sx, y1 * sy, (x2 - x1) * sx, (y2 - y1) * sy);
      }
    };

    img.addEventListener('load', draw);
    const ro = new ResizeObserver(draw);
    ro.observe(img);
    draw();
    return () => {
      img.removeEventListener('load', draw);
      ro.disconnect();
    };
  }, [annotations, activeId, mode, drawRect, imageUrl]);

  function getCanvasPoint(e: React.MouseEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function handleMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    const img = imgRef.current;
    if (!img || !img.naturalWidth) return;
    const cp = getCanvasPoint(e);
    const ip = toImg(cp.x, cp.y, img);
    const { sx, sy } = getScales(img);

    if (mode === 'draw') {
      drawingRef.current = { start: ip };
      onDrawRectChange({ x1: ip.x, y1: ip.y, x2: ip.x, y2: ip.y });
      return;
    }

    // Select mode: check resize handles on active annotation first
    const activeAnn = annotations.find((a) => a.id === activeId);
    if (activeAnn) {
      const h = hitHandle(activeAnn.bbox, cp.x, cp.y, sx, sy);
      if (h) {
        resizingRef.current = { ann: activeAnn, handle: h, startImgPt: ip };
        return;
      }
    }

    // Check if clicking inside any annotation
    const hitId = hitAnnotation(annotations, cp.x, cp.y, sx, sy);
    if (hitId) {
      onSelect(hitId);
      const ann = annotations.find((a) => a.id === hitId)!;
      movingRef.current = { ann: { ...ann }, startImgPt: ip };
    } else {
      onSelect(null);
    }
  }

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const img = imgRef.current;
    if (!img || !img.naturalWidth) return;
    const cp = getCanvasPoint(e);
    const ip = toImg(cp.x, cp.y, img);
    const { sx, sy } = getScales(img);

    // Update cursor
    let cursor = mode === 'draw' ? 'crosshair' : 'default';
    if (mode === 'select') {
      const activeAnn = annotations.find((a) => a.id === activeId);
      if (activeAnn) {
        const h = hitHandle(activeAnn.bbox, cp.x, cp.y, sx, sy);
        if (h) {
          const CURSORS: Record<HandleType, string> = {
            tl: 'nw-resize', tr: 'ne-resize', bl: 'sw-resize', br: 'se-resize',
            tm: 'n-resize', bm: 's-resize', ml: 'w-resize', mr: 'e-resize',
          };
          cursor = CURSORS[h];
        }
      }
      if (cursor === 'default' && hitAnnotation(annotations, cp.x, cp.y, sx, sy)) {
        cursor = 'move';
      }
    }
    e.currentTarget.style.cursor = cursor;

    // Draw mode drag
    if (mode === 'draw' && drawingRef.current) {
      onDrawRectChange({
        x1: Math.min(drawingRef.current.start.x, ip.x),
        y1: Math.min(drawingRef.current.start.y, ip.y),
        x2: Math.max(drawingRef.current.start.x, ip.x),
        y2: Math.max(drawingRef.current.start.y, ip.y),
      });
      return;
    }

    // Resize drag
    if (resizingRef.current) {
      const { ann, handle, startImgPt } = resizingRef.current;
      const dx = ip.x - startImgPt.x;
      const dy = ip.y - startImgPt.y;
      const newBbox = applyResize(ann.bbox, handle, dx, dy, img.naturalWidth, img.naturalHeight);
      onUpdate({ ...ann, bbox: newBbox });
      return;
    }

    // Move drag
    if (movingRef.current) {
      const { ann, startImgPt } = movingRef.current;
      const dx = ip.x - startImgPt.x;
      const dy = ip.y - startImgPt.y;
      const raw = {
        x1: ann.bbox.x1 + dx,
        y1: ann.bbox.y1 + dy,
        x2: ann.bbox.x2 + dx,
        y2: ann.bbox.y2 + dy,
      };
      onUpdate({ ...ann, bbox: clampBbox(raw, img.naturalWidth, img.naturalHeight) });
    }
  }

  function handleMouseUp() {
    const img = imgRef.current;
    if (mode === 'draw' && drawingRef.current && drawRect && img) {
      const w = drawRect.x2 - drawRect.x1;
      const h = drawRect.y2 - drawRect.y1;
      if (w > 5 && h > 5) {
        const ann: Annotation = {
          id: crypto.randomUUID(),
          class_id: 1,
          confidence: 1.0,
          bbox: clampBbox(drawRect, img.naturalWidth, img.naturalHeight),
        };
        onAdd(ann);
        onSelect(ann.id);
      }
      drawingRef.current = null;
      onDrawRectChange(null);
    }
    resizingRef.current = null;
    movingRef.current = null;
  }

  function handleMouseLeave() {
    if (drawingRef.current) {
      drawingRef.current = null;
      onDrawRectChange(null);
    }
    resizingRef.current = null;
    movingRef.current = null;
  }

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src={imageUrl}
        alt="PCB to annotate"
        style={{ display: 'block', width: '100%', borderRadius: 'var(--radius-md)' }}
      />
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        style={{
          position: 'absolute', top: 0, left: 0,
          width: '100%', height: '100%',
          borderRadius: 'var(--radius-md)',
        }}
      />
    </div>
  );
}
