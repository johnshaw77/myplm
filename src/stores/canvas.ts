import { defineStore } from 'pinia';
import { computed, ref, shallowRef } from 'vue';
import type {
  ArrowItem,
  CanvasItem,
  PathItem,
  Point,
  RectItem,
  StickyItem,
  TextItem,
  Tool,
  Viewport,
} from '@/types';
import { clamp, getItemBBox, uid, unionBBox } from '@/utils/geometry';

const STICKY_COLORS = [
  'var(--sticky-yellow)',
  'var(--sticky-pink)',
  'var(--sticky-blue)',
  'var(--sticky-green)',
  'var(--sticky-purple)',
  'var(--sticky-orange)',
];

export const useCanvasStore = defineStore('canvas', () => {
  // ---- Viewport ----------------------------------------------------------
  const viewport = ref<Viewport>({ tx: 0, ty: 0, zoom: 1 });

  function setViewport(next: Partial<Viewport>) {
    viewport.value = { ...viewport.value, ...next };
  }

  function panBy(dx: number, dy: number) {
    viewport.value.tx += dx;
    viewport.value.ty += dy;
  }

  function zoomAt(screenX: number, screenY: number, factor: number) {
    const { tx, ty, zoom } = viewport.value;
    const nextZoom = clamp(zoom * factor, 0.1, 4);
    // Keep the world point under the cursor stable.
    const worldX = (screenX - tx) / zoom;
    const worldY = (screenY - ty) / zoom;
    viewport.value.tx = screenX - worldX * nextZoom;
    viewport.value.ty = screenY - worldY * nextZoom;
    viewport.value.zoom = nextZoom;
  }

  function resetViewport() {
    viewport.value = { tx: 0, ty: 0, zoom: 1 };
  }

  // ---- Tool --------------------------------------------------------------
  const tool = ref<Tool>('select');
  function setTool(t: Tool) {
    tool.value = t;
    // Clear selection when switching to a creation tool to reduce confusion.
    if (t !== 'select' && t !== 'pan') clearSelection();
  }

  // ---- Items -------------------------------------------------------------
  // shallowRef: the array reference triggers updates; mutate via replace.
  const items = shallowRef<CanvasItem[]>([]);
  let zCounter = 1;

  function nextZ(): number {
    zCounter += 1;
    return zCounter;
  }

  function addItem(item: CanvasItem) {
    pushHistory();
    items.value = [...items.value, item];
  }

  function updateItem(id: string, patch: Partial<CanvasItem>) {
    items.value = items.value.map((it) =>
      it.id === id ? ({ ...it, ...patch } as CanvasItem) : it,
    );
  }

  function updateItems(updates: Array<{ id: string; patch: Partial<CanvasItem> }>) {
    const map = new Map(updates.map((u) => [u.id, u.patch]));
    items.value = items.value.map((it) => {
      const p = map.get(it.id);
      return p ? ({ ...it, ...p } as CanvasItem) : it;
    });
  }

  function removeItems(ids: string[]) {
    if (!ids.length) return;
    pushHistory();
    const set = new Set(ids);
    items.value = items.value.filter((it) => !set.has(it.id));
    selectedIds.value = selectedIds.value.filter((id) => !set.has(id));
  }

  function bringToFront(ids: string[]) {
    if (!ids.length) return;
    items.value = items.value.map((it) =>
      ids.includes(it.id) ? { ...it, zIndex: nextZ() } : it,
    );
  }

  // ---- Selection ---------------------------------------------------------
  const selectedIds = ref<string[]>([]);
  const selectedItems = computed(() =>
    items.value.filter((it) => selectedIds.value.includes(it.id)),
  );
  const selectionBBox = computed(() => {
    const boxes = selectedItems.value.map(getItemBBox);
    return unionBBox(boxes);
  });

  function selectOnly(id: string) {
    selectedIds.value = [id];
    bringToFront([id]);
  }
  function selectMany(ids: string[]) {
    selectedIds.value = [...new Set(ids)];
  }
  function toggleSelect(id: string) {
    selectedIds.value = selectedIds.value.includes(id)
      ? selectedIds.value.filter((x) => x !== id)
      : [...selectedIds.value, id];
  }
  function clearSelection() {
    selectedIds.value = [];
  }
  const isSelected = (id: string) => selectedIds.value.includes(id);

  // ---- Item factories ----------------------------------------------------
  function makeSticky(at: Point): StickyItem {
    const color = STICKY_COLORS[items.value.length % STICKY_COLORS.length];
    const w = 200;
    const h = 200;
    return {
      id: uid('s'),
      type: 'sticky',
      x: at.x - w / 2,
      y: at.y - h / 2,
      width: w,
      height: h,
      text: '',
      color,
      zIndex: nextZ(),
    };
  }
  function makeRect(at: Point): RectItem {
    const w = 220;
    const h = 140;
    return {
      id: uid('r'),
      type: 'rect',
      x: at.x - w / 2,
      y: at.y - h / 2,
      width: w,
      height: h,
      fill: '#ffffff',
      stroke: '#1f2328',
      zIndex: nextZ(),
    };
  }
  function makeText(at: Point): TextItem {
    const w = 220;
    const h = 40;
    return {
      id: uid('t'),
      type: 'text',
      x: at.x - w / 2,
      y: at.y - h / 2,
      width: w,
      height: h,
      text: '輸入文字',
      fontSize: 24,
      color: '#1f2328',
      zIndex: nextZ(),
    };
  }
  function makePath(start: Point): PathItem {
    return {
      id: uid('p'),
      type: 'path',
      x: start.x,
      y: start.y,
      points: [{ x: 0, y: 0 }],
      stroke: '#1f2328',
      strokeWidth: 3,
      zIndex: nextZ(),
    };
  }
  function makeArrow(start: Point, end: Point = start): ArrowItem {
    return {
      id: uid('a'),
      type: 'arrow',
      x: start.x,
      y: start.y,
      start: { x: 0, y: 0 },
      end: { x: end.x - start.x, y: end.y - start.y },
      stroke: '#1f2328',
      strokeWidth: 2,
      zIndex: nextZ(),
    };
  }

  // ---- History (snapshot-based undo/redo) -------------------------------
  type Snapshot = { items: CanvasItem[]; selectedIds: string[] };
  const past = ref<Snapshot[]>([]);
  const future = ref<Snapshot[]>([]);
  const HISTORY_LIMIT = 50;

  function snapshot(): Snapshot {
    return {
      items: items.value.map((it) => structuredClone(it)),
      selectedIds: [...selectedIds.value],
    };
  }
  function pushHistory() {
    past.value.push(snapshot());
    if (past.value.length > HISTORY_LIMIT) past.value.shift();
    future.value = [];
  }
  function undo() {
    const prev = past.value.pop();
    if (!prev) return;
    future.value.push(snapshot());
    items.value = prev.items;
    selectedIds.value = prev.selectedIds;
  }
  function redo() {
    const next = future.value.pop();
    if (!next) return;
    past.value.push(snapshot());
    items.value = next.items;
    selectedIds.value = next.selectedIds;
  }

  return {
    // state
    viewport,
    tool,
    items,
    selectedIds,
    selectedItems,
    selectionBBox,
    // viewport
    setViewport,
    panBy,
    zoomAt,
    resetViewport,
    // tools
    setTool,
    // items
    addItem,
    updateItem,
    updateItems,
    removeItems,
    bringToFront,
    // factories
    makeSticky,
    makeRect,
    makeText,
    makePath,
    makeArrow,
    // selection
    selectOnly,
    selectMany,
    toggleSelect,
    clearSelection,
    isSelected,
    // history
    pushHistory,
    undo,
    redo,
  };
});
