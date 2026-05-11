<script setup lang="ts">
import { computed } from 'vue';
import type { PathItem } from '@/types';
import { pointsToSmoothPath } from '@/utils/geometry';

const props = defineProps<{ item: PathItem; selected: boolean }>();
const d = computed(() => pointsToSmoothPath(props.item.points));
</script>

<template>
  <g :transform="`translate(${item.x} ${item.y})`">
    <!-- invisible wider hit-area for easier picking -->
    <path
      :d="d"
      fill="none"
      stroke="transparent"
      :stroke-width="Math.max(12, item.strokeWidth + 8)"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      :d="d"
      fill="none"
      :stroke="item.stroke"
      :stroke-width="item.strokeWidth"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </g>
</template>
