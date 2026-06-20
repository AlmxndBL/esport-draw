<script setup lang="ts">
import type { DrawMode } from '~/types'

const { drawMode } = useDraw()

const modes: { key: DrawMode; label: string; icon: string; hint: string }[] = [
  { key: 'wheel', label: 'สุ่มวงล้อ', icon: 'i-lucide-rotate-cw', hint: 'หมุนวงล้อสุ่มทีมเข้าสาย' },
  { key: 'manual', label: 'จัดเอง (ลากวาง)', icon: 'i-lucide-hand', hint: 'ลากทีมจากกองไปวางในสายเอง' },
]
</script>

<template>
  <div class="border-default bg-elevated/40 inline-flex flex-wrap items-center gap-1 rounded-xl border p-1">
    <button
      v-for="m in modes"
      :key="m.key"
      type="button"
      class="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition"
      :class="
        drawMode === m.key
          ? 'bg-primary text-white shadow-sm shadow-cyan-500/30'
          : 'text-muted hover:text-highlighted hover:bg-white/5'
      "
      :title="m.hint"
      @click="drawMode = m.key"
    >
      <UIcon :name="m.icon" class="size-4" />
      {{ m.label }}
    </button>
  </div>
</template>
