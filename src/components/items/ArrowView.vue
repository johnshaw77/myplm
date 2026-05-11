<script setup lang="ts">
import { computed } from 'vue';
import type { ArrowItem } from '@/types';

const props = defineProps<{ item: ArrowItem; selected: boolean }>();

const path = computed(() => {
  const { start, end } = props.item;
  // Slight quadratic curve so it feels organic rather than ruler-straight.
  const mx = (start.x + end.x) / 2;
  const my = (start.y + end.y) / 2;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const len = Math.max(1, Math.sqrt(dx * dx + dy * dy));
  // Perpendicular bow: 0 for very short, capped for long arrows.
  const bow = Math.min(20, len * 0.05);
  const nx = -dy / len;
  const ny = dx / len;
  const cx = mx + nx * bow;
  const cy = my + ny * bow;
  return `M ${start.x} ${start.y} Q ${cx} ${cy} ${end.x} ${end.y}`;
});

const markerId = computed(() => `arrowhead-${props.item.id}`);
</script>

<template>
  <g :transform="`translate(${item.x} ${item.y})`">
    <defs>
      <marker
        :id="markerId"
        viewBox="0 0 10 10"
        refX="8"
        refY="5"
        markerWidth="8"
        markerHeight="8"
        orient="auto-start-reverse"
      >
        <path d="M 0 0 L 10 5 L 0 10 z" :fill="item.stroke" />
      </marker>
    </defs>
    <!-- hit-area -->
    <path
      :d="path"
      fill="none"
      stroke="transparent"
      :stroke-width="Math.max(14, item.strokeWidth + 10)"
      stroke-linecap="round"
    />
    <path
      :d="path"
      fill="none"
      :stroke="item.stroke"
      :stroke-width="item.strokeWidth"
      stroke-linecap="round"
      :marker-end="`url(#${markerId})`"
    />
  </g>
</template>
