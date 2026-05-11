<script setup lang="ts">
import Canvas from './components/Canvas.vue';
import Toolbar from './components/Toolbar.vue';
import { useKeybindings } from './composables/useKeybindings';
import { useCanvasStore } from './stores/canvas';
import { computed } from 'vue';

useKeybindings();
const store = useCanvasStore();

const hint = computed(() => {
  switch (store.tool) {
    case 'select': return '點擊選取 · 拖曳框選 · Shift+點擊複選 · 按住空白鍵或 H 平移';
    case 'pan':    return '拖曳畫布平移 · 滾輪縮放';
    case 'sticky': return '點擊任意位置新增便利貼';
    case 'rect':   return '拖曳建立矩形';
    case 'text':   return '點擊任意位置新增文字';
    case 'pen':    return '按住拖曳自由繪製';
    case 'arrow':  return '從一點拖曳到另一點建立箭頭';
  }
  return '';
});
</script>

<template>
  <div class="app">
    <Canvas />

    <header class="topbar">
      <div class="brand">MyPLM <span>Canvas</span></div>
      <div class="hint">{{ hint }}</div>
      <div class="meta">{{ store.items.length }} 個元件 · {{ store.selectedIds.length }} 個選取</div>
    </header>

    <Toolbar />
  </div>
</template>

<style scoped>
.app {
  position: fixed;
  inset: 0;
}
.topbar {
  position: fixed;
  top: 16px;
  left: 16px;
  right: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  pointer-events: none;
  z-index: 10;
}
.brand,
.hint,
.meta {
  background: var(--panel);
  border: 1px solid var(--panel-border);
  border-radius: 999px;
  padding: 8px 14px;
  box-shadow: var(--shadow);
  pointer-events: auto;
  font-size: 13px;
  font-weight: 500;
}
.brand {
  font-weight: 700;
  letter-spacing: 0.5px;
}
.brand span {
  color: var(--accent);
  margin-left: 4px;
}
.hint {
  color: var(--muted);
  font-weight: 400;
  flex: 1;
  text-align: center;
  max-width: 600px;
}
.meta {
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}
</style>
