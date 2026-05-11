<script setup lang="ts">
import { computed } from 'vue';
import { useCanvasStore } from '@/stores/canvas';
import type { Tool } from '@/types';

const store = useCanvasStore();

interface ToolEntry { tool: Tool; label: string; key: string; icon: string; }
const tools: ToolEntry[] = [
  { tool: 'select', label: '選取', key: 'V', icon: '↖' },
  { tool: 'pan',    label: '平移', key: 'H', icon: '✥' },
  { tool: 'sticky', label: '便利貼', key: 'N', icon: '▦' },
  { tool: 'rect',   label: '矩形', key: 'R', icon: '▭' },
  { tool: 'text',   label: '文字', key: 'T', icon: 'T' },
  { tool: 'pen',    label: '畫筆', key: 'P', icon: '✎' },
  { tool: 'arrow',  label: '箭頭', key: 'A', icon: '→' },
];

const zoomPct = computed(() => Math.round(store.viewport.zoom * 100));

function zoomCenter(factor: number) {
  store.zoomAt(window.innerWidth / 2, window.innerHeight / 2, factor);
}
</script>

<template>
  <div class="toolbar-wrap">
    <div class="toolbar">
      <button
        v-for="t in tools"
        :key="t.tool"
        class="tool-btn"
        :class="{ active: store.tool === t.tool }"
        :title="`${t.label} (${t.key})`"
        @click="store.setTool(t.tool)"
      >
        <span class="icon" aria-hidden>{{ t.icon }}</span>
        <span class="kbd">{{ t.key }}</span>
      </button>
    </div>

    <div class="toolbar zoom">
      <button class="tool-btn" title="縮小" @click="zoomCenter(1 / 1.2)">−</button>
      <button class="tool-btn pct" @click="store.resetViewport()">{{ zoomPct }}%</button>
      <button class="tool-btn" title="放大" @click="zoomCenter(1.2)">+</button>
    </div>
  </div>
</template>

<style scoped>
.toolbar-wrap {
  position: fixed;
  left: 50%;
  bottom: 24px;
  transform: translateX(-50%);
  display: flex;
  gap: 12px;
  z-index: 20;
  pointer-events: none;
}
.toolbar {
  background: var(--panel);
  border: 1px solid var(--panel-border);
  border-radius: 14px;
  padding: 6px;
  display: flex;
  gap: 2px;
  box-shadow: var(--shadow);
  pointer-events: auto;
}
.tool-btn {
  position: relative;
  width: 44px;
  height: 44px;
  border: none;
  background: transparent;
  border-radius: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  color: var(--text);
  transition: background 0.12s, color 0.12s, transform 0.06s;
}
.tool-btn:hover { background: var(--accent-soft); color: var(--accent); }
.tool-btn:active { transform: scale(0.96); }
.tool-btn.active {
  background: var(--accent);
  color: #fff;
}
.tool-btn .kbd {
  position: absolute;
  bottom: 3px;
  right: 5px;
  font-size: 9px;
  opacity: 0.55;
  font-weight: 600;
}
.tool-btn.active .kbd { opacity: 0.85; }
.tool-btn.pct {
  width: 64px;
  font-weight: 600;
  font-size: 13px;
}
</style>
