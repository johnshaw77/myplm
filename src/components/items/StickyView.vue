<script setup lang="ts">
import { ref, watch } from 'vue';
import type { StickyItem } from '@/types';
import { useCanvasStore } from '@/stores/canvas';

const props = defineProps<{ item: StickyItem; selected: boolean; editing: boolean }>();
const emit = defineEmits<{ (e: 'commit'): void }>();
const store = useCanvasStore();
const textRef = ref<HTMLDivElement | null>(null);

watch(
  () => props.editing,
  (e) => {
    if (e) {
      requestAnimationFrame(() => {
        textRef.value?.focus();
        // Move cursor to the end.
        const sel = window.getSelection();
        const range = document.createRange();
        if (textRef.value) {
          range.selectNodeContents(textRef.value);
          range.collapse(false);
          sel?.removeAllRanges();
          sel?.addRange(range);
        }
      });
    }
  },
);

function onInput(e: Event) {
  const t = (e.target as HTMLDivElement).innerText;
  store.updateItem(props.item.id, { text: t } as Partial<StickyItem>);
}
function onBlur() {
  emit('commit');
}
</script>

<template>
  <foreignObject
    :x="item.x"
    :y="item.y"
    :width="item.width"
    :height="item.height"
    class="sticky"
    :class="{ selected }"
  >
    <div
      class="sticky-body"
      :style="{ background: item.color, width: '100%', height: '100%' }"
    >
      <div
        ref="textRef"
        class="sticky-text"
        :contenteditable="editing"
        spellcheck="false"
        @input="onInput"
        @blur="onBlur"
        @mousedown.stop
        @pointerdown.stop
      >{{ item.text }}</div>
    </div>
  </foreignObject>
</template>

<style scoped>
.sticky-body {
  border-radius: 4px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15), 0 8px 18px rgba(0, 0, 0, 0.08);
  padding: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  line-height: 1.35;
  color: #1f2328;
  font-family: inherit;
  overflow: hidden;
}
.sticky-text {
  width: 100%;
  height: 100%;
  outline: none;
  white-space: pre-wrap;
  word-break: break-word;
  text-align: center;
  cursor: text;
  display: flex;
  align-items: center;
  justify-content: center;
}
.sticky-text[contenteditable='true'] {
  cursor: text;
  text-align: left;
  align-items: flex-start;
  justify-content: flex-start;
}
</style>
