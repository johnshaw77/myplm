import type { Point, Viewport } from '@/types';

/** Convert screen-space coordinates (relative to canvas root) to world space. */
export function screenToWorld(
  screen: Point,
  viewport: Viewport,
): Point {
  return {
    x: (screen.x - viewport.tx) / viewport.zoom,
    y: (screen.y - viewport.ty) / viewport.zoom,
  };
}

/** Convert world-space coordinates to screen space. */
export function worldToScreen(
  world: Point,
  viewport: Viewport,
): Point {
  return {
    x: world.x * viewport.zoom + viewport.tx,
    y: world.y * viewport.zoom + viewport.ty,
  };
}

/** Get screen point relative to a target element. */
export function getLocalPoint(
  e: { clientX: number; clientY: number },
  el: Element,
): Point {
  const rect = el.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}
