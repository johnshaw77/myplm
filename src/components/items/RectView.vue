<script setup lang="ts">
import type { RectItem } from '@/types';

defineProps<{ item: RectItem; selected: boolean }>();
</script>

<template>
  <rect
    :x="item.x"
    :y="item.y"
    :width="item.width"
    :height="item.height"
    :fill="item.fill"
    :stroke="item.stroke"
    stroke-width="2"
    rx="6"
    ry="6"
    class="rect"
  />
</template>

<style scoped>
.rect {
  filter: drop-shadow(0 1px 2px rgba(15, 23, 42, 0.08));
}
</style>
