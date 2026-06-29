'use client';

import { useEffect, useRef } from 'react';
import { DEFECT_COLORS } from '@/lib/poll';

export type DiffTag = 'new' | 'edited' | 'unchanged';

export interface CorrectionItem {
  id: string;
  class_id: number;
  bbox: { x1: number; y1: number; x2: number; y2: number };
  tag: DiffTag;
  findingId: string | null;
}

export type AnnotationMode = 'draw' | 'select';

type HandleType = 'tl' | 'tm' | 'tr' | 'ml' | 'mr' | 'bl' | 'bm' | 'br';
const HS = 5;

function getItemColor(item: CorrectionItem): string {
  if (item.tag === 'new') return '#C87941';
  if (item.tag === 'edited') return '#F59E0B';
  return DEFECT_COLORS[item.class_id] ?? '#ffffff';
}

function getScales(img: HTMLImageElement) {
  return { sx: img.offsetWidth / img.naturalWidth, sy: img.offsetHeight / img.naturalHeight };
}

function toImg(cx: number, cy: number, img: HTMLImageElement) {
  const { sx, sy } = getScales(img);
  return { x: cx / sx, y: cy / sy };
}

function getHandlePositions(
  bbox: CorrectionItem['bbox'],
  sx: number,
  sy: number,
): Record<HandleType, [number, number]> {
  const { x1, y1, x2, y2 } = bbox;
  const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2;
  return {
    tl: [x1 * sx, y1 * sy], tm: [cx * sx, y1 * sy], tr: [x2 * sx, y1 * sy],
    ml: [x1 * sx, cy * sy], mr: [x2 * sx, cy * sy],
    bl: [x1 * sx, y2 * sy], bm: [cx * sx, y2 * sy], br: [x2 * sx, y2 * sy],
  };
}

function hitHandle(
  bbox: CorrectionItem['bbox'],
  cx: number, cy: number,
  sx: number, sy: number,
): HandleType | null {
  const handles = getHandlePositions(bbox, sx, sy);
  for (const [type, [hx, hy]] of Object.entries(handles) as [HandleType, [number, number]][]) {
    if (Math.abs(cx - hx) <= HS + 3 && Math.abs(cy - hy) <= HS + 3) return type;
  }
  return null;
}

function hitItem(
  items: CorrectionItem[],
  cx: number, cy: number,
  sx: number, sy: number,
): string | null {
  for (let i = items.length - 1; i >= 0; i--) {
    const { id, bbox } = items[i];
    if (cx >= bbox.x1 * sx && cx <= bbox.x2 * sx && cy >= bbox.y1 * sy && cy <= bbox.y2 * sy) return id;
  }
  return null;
}

function applyResize(
  orig: CorrectionItem['bbox'],
  handle: HandleType,
  dx: number, dy: number,
  natW: number, natH: number,
): CorrectionItem['bbox'] {
  let { x1, y1, x2, y2 } = orig;
  if (handle[0] === 't') y1 += dy;
  if (handle[0] === 'b') y2 += dy;
  if (handle[1] === 'l') x1 += dx;
  if (handle[1] === 'r') x2 += dx;
  x1 = Math.max(0, Math.min(x1, natW)); x2 = Math.max(0, Math.min(x2, natW));
  y1 = Math.max(0, Math.min(y1, natH)); y2 = Math.max(0, Math.min(y2, natH));
  return { x1: Math.min(x1, x2), y1: Math.min(y1, y2), x2: Math.max(x1, x2), y2: Math.max(y1, y2) };
}

function clampBbox(bbox: CorrectionItem['bbox'], natW: number, natH: number): CorrectionItem['bbox'] {
  return {
    x1: Math.max(0, Math.min(bbox.x1, natW)), y1: Math.max(0, Math.min(bbox.y1, natH)),
    x2: Math.max(0, Math.min(bbox.x2, natW)), y2: Math.max(0, Math.min(bbox.y2, natH)),
  };
}

interface Props {
  imageUrl: string;
  items: CorrectionItem[];
  activeId: string | null;
  mode: AnnotationMode;
  drawRect: CorrectionItem['bbox'] | null;
  classNames: Record<number, string>;
  onAdd: (item: CorrectionItem) => void;
  onUpdate: (item: CorrectionItem) => void;
  onSelect: (id: string | null) => void;
  onDrawRectChange: (r: CorrectionItem['bbox'] | null) => void;
}

export default function AnnotationCanvas({
  imageUrl, items, activeId, mode, drawRect,
  classNames, onAdd, onUpdate, onSelect, onDrawRectChange,
}: Props) {
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const drawingRef = useRef<{ start: { x: number; y: number } } | null>(null);
  const resizingRef = useRef<{
    item: CorrectionItem; handle: HandleType; startImgPt: { x: number; y: number };
  } | null>(null);
  const movingRef = useRef<{
    item: CorrectionItem; startImgPt: { x: number; y: number };
  } | null>(null);

  useEffect(() => {
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) return;

    const draw = () => {
      if (!img.complete || !img.naturalWidth) return;
      const w = img.offsetWidth, h = img.offsetHeight;
      if (!w || !h) return;
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.clearRect(0, 0, w, h);
      const sx = w / img.naturalWidth, sy = h / img.naturalHeight;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const { x1, y1, x2, y2 } = item.bbox;
        const color = getItemColor(item);
        const isActive = item.id === activeId;
        const rx = x1 * sx, ry = y1 * sy, rw = (x2 - x1) * sx, rh = (y2 - y1) * sy;

        ctx.fillStyle = color + (isActive ? '40' : '20');
        ctx.fillRect(rx, ry, rw, rh);
        ctx.strokeStyle = color;
        ctx.lineWidth = isActive ? 2.5 : 1.5;
        ctx.setLineDash([]);
        ctx.strokeRect(rx, ry, rw, rh);

        ctx.font = "11px 'JetBrains Mono', monospace";
        const tagPrefix = item.tag === 'new' ? 'NEW · ' : item.tag === 'edited' ? 'EDT · ' : '';
        const label = tagPrefix + (classNames[item.class_id] ?? `cls ${item.class_id}`);
        const lw = ctx.measureText(label).width + 8;
        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        ctx.fillRect(rx, ry - 18, lw, 17);
        ctx.fillStyle = color;
        ctx.fillText(label, rx + 4, ry - 4);

        if (isActive && mode === 'select') {
          const handles = getHandlePositions(item.bbox, sx, sy);
          ctx.fillStyle = color; ctx.strokeStyle = '#0D0F0E'; ctx.lineWidth = 1;
          for (const [, [hx, hy]] of Object.entries(handles)) {
            ctx.fillRect(hx - HS, hy - HS, HS * 2, HS * 2);
            ctx.strokeRect(hx - HS, hy - HS, HS * 2, HS * 2);
          }
        }
      }

      if (drawRect) {
        const { x1, y1, x2, y2 } = drawRect;
        ctx.save();
        ctx.strokeStyle = '#C87941'; ctx.lineWidth = 1.5; ctx.setLineDash([6, 3]);
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
    return () => { img.removeEventListener('load', draw); ro.disconnect(); };
  }, [items, activeId, mode, drawRect, imageUrl, classNames]);

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

    const activeItem = items.find(a => a.id === activeId);
    if (activeItem) {
      const h = hitHandle(activeItem.bbox, cp.x, cp.y, sx, sy);
      if (h) {
        resizingRef.current = { item: { ...activeItem }, handle: h, startImgPt: ip };
        return;
      }
    }

    const hitId = hitItem(items, cp.x, cp.y, sx, sy);
    if (hitId) {
      onSelect(hitId);
      const found = items.find(a => a.id === hitId)!;
      movingRef.current = { item: { ...found }, startImgPt: ip };
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

    let cursor = mode === 'draw' ? 'crosshair' : 'default';
    if (mode === 'select') {
      const activeItem = items.find(a => a.id === activeId);
      if (activeItem) {
        const h = hitHandle(activeItem.bbox, cp.x, cp.y, sx, sy);
        if (h) {
          const CURSORS: Record<HandleType, string> = {
            tl: 'nw-resize', tr: 'ne-resize', bl: 'sw-resize', br: 'se-resize',
            tm: 'n-resize', bm: 's-resize', ml: 'w-resize', mr: 'e-resize',
          };
          cursor = CURSORS[h];
        }
      }
      if (cursor === 'default' && hitItem(items, cp.x, cp.y, sx, sy)) cursor = 'move';
    }
    e.currentTarget.style.cursor = cursor;

    if (mode === 'draw' && drawingRef.current) {
      onDrawRectChange({
        x1: Math.min(drawingRef.current.start.x, ip.x),
        y1: Math.min(drawingRef.current.start.y, ip.y),
        x2: Math.max(drawingRef.current.start.x, ip.x),
        y2: Math.max(drawingRef.current.start.y, ip.y),
      });
      return;
    }

    if (resizingRef.current) {
      const { item, handle, startImgPt } = resizingRef.current;
      const dx = ip.x - startImgPt.x, dy = ip.y - startImgPt.y;
      onUpdate({ ...item, bbox: applyResize(item.bbox, handle, dx, dy, img.naturalWidth, img.naturalHeight) });
      return;
    }

    if (movingRef.current) {
      const { item, startImgPt } = movingRef.current;
      const dx = ip.x - startImgPt.x, dy = ip.y - startImgPt.y;
      const raw = { x1: item.bbox.x1 + dx, y1: item.bbox.y1 + dy, x2: item.bbox.x2 + dx, y2: item.bbox.y2 + dy };
      onUpdate({ ...item, bbox: clampBbox(raw, img.naturalWidth, img.naturalHeight) });
    }
  }

  function handleMouseUp() {
    const img = imgRef.current;
    if (mode === 'draw' && drawingRef.current && drawRect && img) {
      const w = drawRect.x2 - drawRect.x1, h = drawRect.y2 - drawRect.y1;
      if (w > 5 && h > 5) {
        const newItem: CorrectionItem = {
          id: crypto.randomUUID(),
          class_id: 1,
          bbox: clampBbox(drawRect, img.naturalWidth, img.naturalHeight),
          tag: 'new',
          findingId: null,
        };
        onAdd(newItem);
        onSelect(newItem.id);
      }
      drawingRef.current = null;
      onDrawRectChange(null);
    }
    resizingRef.current = null;
    movingRef.current = null;
  }

  function handleMouseLeave() {
    if (drawingRef.current) { drawingRef.current = null; onDrawRectChange(null); }
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
