export type Tool =
  | 'select'
  | 'pan'
  | 'sticky'
  | 'rect'
  | 'text'
  | 'pen'
  | 'arrow';

export interface Point {
  x: number;
  y: number;
}

export interface Viewport {
  /** Translation in screen pixels (top-left of world origin in screen space). */
  tx: number;
  ty: number;
  /** Zoom factor (1 = 100%). */
  zoom: number;
}

interface ItemBase {
  id: string;
  /** World-space top-left X. For arrow/path this is the bounding-box origin. */
  x: number;
  y: number;
  zIndex: number;
}

export interface StickyItem extends ItemBase {
  type: 'sticky';
  width: number;
  height: number;
  text: string;
  color: string;
}

export interface RectItem extends ItemBase {
  type: 'rect';
  width: number;
  height: number;
  fill: string;
  stroke: string;
}

export interface TextItem extends ItemBase {
  type: 'text';
  width: number;
  height: number;
  text: string;
  fontSize: number;
  color: string;
}

export interface PathItem extends ItemBase {
  type: 'path';
  /** Points are stored relative to (x, y) so move = update x,y only. */
  points: Point[];
  stroke: string;
  strokeWidth: number;
}

export interface ArrowItem extends ItemBase {
  type: 'arrow';
  /** Endpoints are stored relative to (x, y). */
  start: Point;
  end: Point;
  stroke: string;
  strokeWidth: number;
}

export type CanvasItem =
  | StickyItem
  | RectItem
  | TextItem
  | PathItem
  | ArrowItem;

export type ItemType = CanvasItem['type'];

export interface BBox {
  x: number;
  y: number;
  width: number;
  height: number;
}
