<script setup lang="ts">
import { ref, watch } from 'vue';
import type { TextItem } from '@/types';
import { useCanvasStore } from '@/stores/canvas';

const props = defineProps<{ item: TextItem; selected: boolean; editing: boolean }>();
const emit = defineEmits<{ (e: 'commit'): void }>();
const store = useCanvasStore();
const textRef = ref<HTMLDivElement | null>(null);

watch(
  () => props.editing,
  (e) => {
    if (e) {
      requestAnimationFrame(() => {
        textRef.value?.focus();
        const sel = window.getSelection();
        const range = document.createRange();
        if (textRef.value) {
          range.selectNodeContents(textRef.value);
          sel?.removeAllRanges();
          sel?.addRange(range);
        }
      });
    }
  },
);

function onInput(e: Event) {
  const t = (e.target as HTMLDivElement).innerText;
  store.updateItem(props.item.id, { text: t } as Partial<TextItem>);
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
    :height="Math.max(item.height, item.fontSize * 2)"
  >
    <div
      ref="textRef"
      class="text-body"
      :contenteditable="editing"
      :style="{ fontSize: item.fontSize + 'px', color: item.color }"
      spellcheck="false"
      @input="onInput"
      @blur="onBlur"
      @mousedown.stop
      @pointerdown.stop
    >{{ item.text }}</div>
  </foreignObject>
</template>

<style scoped>
.text-body {
  width: 100%;
  outline: none;
  white-space: pre-wrap;
  word-break: break-word;
  font-weight: 600;
  line-height: 1.2;
  font-family: inherit;
  cursor: text;
}
</style>
