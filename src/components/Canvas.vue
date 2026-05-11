<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { useCanvasStore } from '@/stores/canvas';
import type { ArrowItem, BBox, CanvasItem, PathItem, Point } from '@/types';
import { bboxIntersects, getItemBBox } from '@/utils/geometry';
import { getLocalPoint, screenToWorld } from '@/composables/useViewport';

import StickyView from './items/StickyView.vue';
import RectView from './items/RectView.vue';
import TextView from './items/TextView.vue';
import PathView from './items/PathView.vue';
import ArrowView from './items/ArrowView.vue';

const store = useCanvasStore();
const root = ref<HTMLDivElement | null>(null);

// ---- Sorted items so larger zIndex paints on top --------------------------
const sortedItems = computed(() =>
  [...store.items].sort((a, b) => a.zIndex - b.zIndex),
);

// ---- Editing (text inline) ------------------------------------------------
const editingId = ref<string | null>(null);

// ---- Pointer interaction state -------------------------------------------
type Mode =
  | { kind: 'idle' }
  | { kind: 'pan'; lastX: number; lastY: number }
  | { kind: 'marquee'; startWorld: Point; current: Point }
  | { kind: 'drag-items'; startWorld: Point; originals: Map<string, Point>; pushed: boolean }
  | { kind: 'draw-path'; id: string }
  | { kind: 'draw-arrow'; id: string }
  | { kind: 'create-shape'; id: string; startWorld: Point };

const mode = ref<Mode>({ kind: 'idle' });
const spaceDown = ref(false);

// Marquee in screen coordinates for overlay drawing.
const marqueeBBox = computed<BBox | null>(() => {
  if (mode.value.kind !== 'marquee') return null;
  const a = mode.value.startWorld;
  const b = mode.value.current;
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    width: Math.abs(a.x - b.x),
    height: Math.abs(a.y - b.y),
  };
});

// Cursor reflects active intent.
const cursor = computed(() => {
  if (mode.value.kind === 'pan') return 'grabbing';
  if (spaceDown.value || store.tool === 'pan') return 'grab';
  if (store.tool === 'sticky' || store.tool === 'rect' || store.tool === 'text') return 'crosshair';
  if (store.tool === 'pen' || store.tool === 'arrow') return 'crosshair';
  return 'default';
});

// ---- Helpers --------------------------------------------------------------
function getWorld(e: PointerEvent): Point {
  const local = getLocalPoint(e, root.value!);
  return screenToWorld(local, store.viewport);
}

function findHitItem(e: PointerEvent): CanvasItem | null {
  // Walk up from event target to find an element with data-item-id.
  let el = e.target as Element | null;
  while (el && el !== root.value) {
    const id = (el as HTMLElement).dataset?.itemId;
    if (id) return store.items.find((i) => i.id === id) ?? null;
    el = el.parentElement;
  }
  return null;
}

// ---- Pointer down ---------------------------------------------------------
function onPointerDown(e: PointerEvent) {
  if (e.button === 1 || (e.button === 0 && (spaceDown.value || store.tool === 'pan'))) {
    // Pan mode (middle mouse OR space-held OR pan tool)
    e.preventDefault();
    mode.value = { kind: 'pan', lastX: e.clientX, lastY: e.clientY };
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    return;
  }
  if (e.button !== 0) return;

  const world = getWorld(e);
  const hit = findHitItem(e);

  // Stop editing if clicking outside the editing item.
  if (editingId.value && hit?.id !== editingId.value) {
    editingId.value = null;
  }

  // ---- Creation tools -----------------------------------------------------
  if (store.tool === 'sticky') {
    const item = store.makeSticky(world);
    store.addItem(item);
    store.setTool('select');
    store.selectOnly(item.id);
    editingId.value = item.id;
    return;
  }
  if (store.tool === 'text') {
    const item = store.makeText(world);
    store.addItem(item);
    store.setTool('select');
    store.selectOnly(item.id);
    editingId.value = item.id;
    return;
  }
  if (store.tool === 'rect') {
    const item = store.makeRect(world);
    // Make creation feel like a click+drag for sizing.
    store.addItem(item);
    mode.value = { kind: 'create-shape', id: item.id, startWorld: world };
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    store.setTool('select');
    store.selectOnly(item.id);
    return;
  }
  if (store.tool === 'pen') {
    const item = store.makePath(world);
    store.addItem(item);
    mode.value = { kind: 'draw-path', id: item.id };
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    return;
  }
  if (store.tool === 'arrow') {
    const item = store.makeArrow(world);
    store.addItem(item);
    mode.value = { kind: 'draw-arrow', id: item.id };
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    return;
  }

  // ---- Select tool --------------------------------------------------------
  if (hit) {
    if (e.shiftKey) {
      store.toggleSelect(hit.id);
    } else if (!store.isSelected(hit.id)) {
      store.selectOnly(hit.id);
    } else {
      // Bring grouped selection above for natural drag layering.
      store.bringToFront(store.selectedIds);
    }
    // Begin group drag.
    const originals = new Map<string, Point>();
    store.selectedItems.forEach((it) => originals.set(it.id, { x: it.x, y: it.y }));
    if (!originals.has(hit.id)) originals.set(hit.id, { x: hit.x, y: hit.y });
    mode.value = { kind: 'drag-items', startWorld: world, originals, pushed: false };
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  } else {
    if (!e.shiftKey) store.clearSelection();
    mode.value = { kind: 'marquee', startWorld: world, current: world };
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  }
}

// ---- Pointer move ---------------------------------------------------------
function onPointerMove(e: PointerEvent) {
  const m = mode.value;
  if (m.kind === 'idle') return;

  if (m.kind === 'pan') {
    const dx = e.clientX - m.lastX;
    const dy = e.clientY - m.lastY;
    store.panBy(dx, dy);
    m.lastX = e.clientX;
    m.lastY = e.clientY;
    return;
  }

  const world = getWorld(e);

  if (m.kind === 'marquee') {
    m.current = world;
    return;
  }

  if (m.kind === 'drag-items') {
    const dx = world.x - m.startWorld.x;
    const dy = world.y - m.startWorld.y;
    if (!m.pushed && (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5)) {
      store.pushHistory();
      m.pushed = true;
    }
    const updates: Array<{ id: string; patch: Partial<CanvasItem> }> = [];
    m.originals.forEach((orig, id) => {
      updates.push({ id, patch: { x: orig.x + dx, y: orig.y + dy } });
    });
    store.updateItems(updates);
    return;
  }

  if (m.kind === 'create-shape') {
    const item = store.items.find((i) => i.id === m.id);
    if (!item || (item.type !== 'rect' && item.type !== 'sticky' && item.type !== 'text')) return;
    const x = Math.min(m.startWorld.x, world.x);
    const y = Math.min(m.startWorld.y, world.y);
    const width = Math.max(20, Math.abs(world.x - m.startWorld.x));
    const height = Math.max(20, Math.abs(world.y - m.startWorld.y));
    store.updateItem(m.id, { x, y, width, height });
    return;
  }

  if (m.kind === 'draw-path') {
    const item = store.items.find((i) => i.id === m.id) as PathItem | undefined;
    if (!item) return;
    const next = { x: world.x - item.x, y: world.y - item.y };
    const last = item.points[item.points.length - 1];
    // Skip near-duplicate samples for a smoother SVG path.
    if (last && Math.hypot(next.x - last.x, next.y - last.y) < 1.5) return;
    store.updateItem(m.id, { points: [...item.points, next] } as Partial<PathItem>);
    return;
  }

  if (m.kind === 'draw-arrow') {
    const item = store.items.find((i) => i.id === m.id) as ArrowItem | undefined;
    if (!item) return;
    store.updateItem(m.id, {
      end: { x: world.x - item.x, y: world.y - item.y },
    } as Partial<ArrowItem>);
    return;
  }
}

// ---- Pointer up -----------------------------------------------------------
function onPointerUp(e: PointerEvent) {
  const m = mode.value;
  try {
    (e.currentTarget as Element).releasePointerCapture(e.pointerId);
  } catch { /* ignore */ }

  if (m.kind === 'marquee' && marqueeBBox.value) {
    const box = marqueeBBox.value;
    const ids = store.items
      .filter((it) => bboxIntersects(getItemBBox(it), box))
      .map((it) => it.id);
    if (ids.length) {
      if (e.shiftKey) {
        const set = new Set([...store.selectedIds, ...ids]);
        store.selectMany([...set]);
      } else {
        store.selectMany(ids);
      }
    } else if (!e.shiftKey) {
      store.clearSelection();
    }
  }

  if (m.kind === 'draw-arrow') {
    const item = store.items.find((i) => i.id === (m as { id: string }).id) as ArrowItem | undefined;
    // Discard zero-length arrows (a click without drag).
    if (item && Math.hypot(item.end.x - item.start.x, item.end.y - item.start.y) < 4) {
      store.removeItems([item.id]);
    }
  }

  mode.value = { kind: 'idle' };
}

// ---- Wheel: zoom or pan ---------------------------------------------------
function onWheel(e: WheelEvent) {
  e.preventDefault();
  const local = getLocalPoint(e, root.value!);
  if (e.ctrlKey || e.metaKey) {
    // Trackpad pinch arrives as ctrl+wheel; mouse with ctrl is intentional.
    const factor = Math.pow(0.998, e.deltaY * 4);
    store.zoomAt(local.x, local.y, factor);
  } else if (Math.abs(e.deltaX) > Math.abs(e.deltaY) || e.shiftKey) {
    // Two-finger trackpad pan (or shift+wheel for horizontal).
    store.panBy(-e.deltaX, -e.deltaY);
  } else {
    // Default mouse wheel: zoom toward cursor.
    const factor = e.deltaY > 0 ? 1 / 1.1 : 1.1;
    store.zoomAt(local.x, local.y, factor);
  }
}

// ---- Double-click to edit text -------------------------------------------
function onDblClick(e: MouseEvent) {
  const id = ((e.target as HTMLElement).closest('[data-item-id]') as HTMLElement | null)?.dataset.itemId;
  if (!id) return;
  const item = store.items.find((i) => i.id === id);
  if (!item) return;
  if (item.type === 'sticky' || item.type === 'text') {
    editingId.value = id;
    store.selectOnly(id);
  }
}

function commitEdit() {
  editingId.value = null;
}

// ---- Space-to-pan tracking ------------------------------------------------
function onKeyDown(e: KeyboardEvent) {
  if (e.code === 'Space' && !spaceDown.value) {
    if (document.activeElement && (document.activeElement as HTMLElement).isContentEditable) return;
    spaceDown.value = true;
    e.preventDefault();
  }
}
function onKeyUp(e: KeyboardEvent) {
  if (e.code === 'Space') spaceDown.value = false;
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
});
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown);
  window.removeEventListener('keyup', onKeyUp);
});

// ---- Selection visualization ---------------------------------------------
const selectionFrames = computed(() =>
  store.selectedItems.map((it) => ({ id: it.id, ...getItemBBox(it) })),
);

// ---- Background grid: pattern with viewport transform --------------------
const gridStyle = reactive<{ size: number; pattern: string }>({
  size: 40,
  pattern: 'dot',
});
</script>

<template>
  <div
    ref="root"
    class="canvas-root"
    :style="{ cursor }"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
    @wheel.passive.prevent="onWheel"
    @dblclick="onDblClick"
    @contextmenu.prevent
  >
    <svg
      class="canvas-svg"
      width="100%"
      height="100%"
      :style="{
        backgroundColor: 'var(--bg)',
        backgroundImage:
          'radial-gradient(circle, var(--grid-strong) 1.2px, transparent 1.2px)',
        backgroundSize: `${gridStyle.size * store.viewport.zoom}px ${gridStyle.size * store.viewport.zoom}px`,
        backgroundPosition: `${store.viewport.tx}px ${store.viewport.ty}px`,
      }"
    >
      <g :transform="`translate(${store.viewport.tx} ${store.viewport.ty}) scale(${store.viewport.zoom})`">
        <g v-for="item in sortedItems" :key="item.id" :data-item-id="item.id" class="item-node">
          <StickyView
            v-if="item.type === 'sticky'"
            :item="item"
            :selected="store.isSelected(item.id)"
            :editing="editingId === item.id"
            @commit="commitEdit"
          />
          <RectView
            v-else-if="item.type === 'rect'"
            :item="item"
            :selected="store.isSelected(item.id)"
          />
          <TextView
            v-else-if="item.type === 'text'"
            :item="item"
            :selected="store.isSelected(item.id)"
            :editing="editingId === item.id"
            @commit="commitEdit"
          />
          <PathView
            v-else-if="item.type === 'path'"
            :item="item"
            :selected="store.isSelected(item.id)"
          />
          <ArrowView
            v-else-if="item.type === 'arrow'"
            :item="item"
            :selected="store.isSelected(item.id)"
          />
        </g>

        <!-- Selection frames -->
        <rect
          v-for="f in selectionFrames"
          :key="`sel-${f.id}`"
          :x="f.x - 2 / store.viewport.zoom"
          :y="f.y - 2 / store.viewport.zoom"
          :width="f.width + 4 / store.viewport.zoom"
          :height="f.height + 4 / store.viewport.zoom"
          fill="none"
          :stroke="'var(--selection)'"
          :stroke-width="1.5 / store.viewport.zoom"
          :stroke-dasharray="`${4 / store.viewport.zoom} ${3 / store.viewport.zoom}`"
          pointer-events="none"
        />

        <!-- Marquee box -->
        <rect
          v-if="marqueeBBox"
          :x="marqueeBBox.x"
          :y="marqueeBBox.y"
          :width="marqueeBBox.width"
          :height="marqueeBBox.height"
          :fill="'var(--selection-fill)'"
          :stroke="'var(--selection)'"
          :stroke-width="1 / store.viewport.zoom"
          pointer-events="none"
        />
      </g>
    </svg>
  </div>
</template>

<style scoped>
.canvas-root {
  position: absolute;
  inset: 0;
  overflow: hidden;
  touch-action: none;
}
.canvas-svg {
  display: block;
}
.item-node {
  /* Disable native text selection on items; editing modes opt back in. */
  user-select: none;
}
</style>
