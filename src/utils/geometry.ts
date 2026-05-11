import type { BBox, CanvasItem, Point } from '@/types';

export function uid(prefix = 'i'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-3)}`;
}

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function getItemBBox(item: CanvasItem): BBox {
  switch (item.type) {
    case 'sticky':
    case 'rect':
    case 'text':
      return { x: item.x, y: item.y, width: item.width, height: item.height };
    case 'path': {
      if (!item.points.length) return { x: item.x, y: item.y, width: 0, height: 0 };
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const p of item.points) {
        if (p.x < minX) minX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.x > maxX) maxX = p.x;
        if (p.y > maxY) maxY = p.y;
      }
      return {
        x: item.x + minX,
        y: item.y + minY,
        width: maxX - minX,
        height: maxY - minY,
      };
    }
    case 'arrow': {
      const minX = Math.min(item.start.x, item.end.x);
      const minY = Math.min(item.start.y, item.end.y);
      const maxX = Math.max(item.start.x, item.end.x);
      const maxY = Math.max(item.start.y, item.end.y);
      return {
        x: item.x + minX,
        y: item.y + minY,
        width: maxX - minX,
        height: maxY - minY,
      };
    }
  }
}

export function bboxIntersects(a: BBox, b: BBox): boolean {
  return !(
    a.x + a.width < b.x ||
    b.x + b.width < a.x ||
    a.y + a.height < b.y ||
    b.y + b.height < a.y
  );
}

export function bboxContains(outer: BBox, inner: BBox): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.width <= outer.x + outer.width &&
    inner.y + inner.height <= outer.y + outer.height
  );
}

export function unionBBox(boxes: BBox[]): BBox | null {
  if (!boxes.length) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const b of boxes) {
    if (b.x < minX) minX = b.x;
    if (b.y < minY) minY = b.y;
    if (b.x + b.width > maxX) maxX = b.x + b.width;
    if (b.y + b.height > maxY) maxY = b.y + b.height;
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export function distance(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Smooth a path of points with Catmull-Rom-ish interpolation, returning an SVG `d`.
 * Keeps path responsive even with sparse pointer samples.
 */
export function pointsToSmoothPath(points: Point[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) {
    const p = points[0];
    return `M ${p.x} ${p.y} l 0.01 0.01`;
  }
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const cur = points[i];
    const mx = (prev.x + cur.x) / 2;
    const my = (prev.y + cur.y) / 2;
    d += ` Q ${prev.x} ${prev.y} ${mx} ${my}`;
  }
  const last = points[points.length - 1];
  d += ` T ${last.x} ${last.y}`;
  return d;
}
