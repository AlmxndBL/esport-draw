<script setup lang="ts">
import type { Stage } from '~/types'

const { stage } = useTournament()

const steps: { key: Stage; label: string; icon: string }[] = [
  { key: 'draw', label: 'จับสาย', icon: 'i-lucide-shuffle' },
  { key: 'group', label: 'แบ่งกลุ่ม', icon: 'i-lucide-table-2' },
  { key: 'knockout', label: 'น็อคเอาท์', icon: 'i-lucide-swords' },
  { key: 'champion', label: 'แชมป์', icon: 'i-lucide-trophy' },
]

const stageOrder: Stage[] = ['draw', 'group', 'knockout', 'champion']

function stageIndex(s: Stage) {
  return stageOrder.indexOf(s)
}

const currentIdx = computed(() => stageIndex(stage.value))
</script>

<template>
  <div class="flex items-center gap-0">
    <template v-for="(step, idx) in steps" :key="step.key">
      <!-- step pill -->
      <div
        class="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition"
        :class="{
          'bg-primary text-white shadow-sm shadow-cyan-500/30': stage === step.key,
          'text-highlighted bg-white/5': stageIndex(step.key) < currentIdx,
          'text-muted': stageIndex(step.key) > currentIdx,
        }"
      >
        <UIcon :name="step.icon" class="size-3.5 flex-none" />
        <span class="hidden sm:block">{{ step.label }}</span>
        <UIcon
          v-if="stageIndex(step.key) < currentIdx"
          name="i-lucide-check"
          class="size-3 text-success"
        />
      </div>

      <!-- connector line -->
      <div
        v-if="idx < steps.length - 1"
        class="h-px flex-1"
        :class="stageIndex(step.key) < currentIdx ? 'bg-primary/40' : 'bg-white/10'"
      />
    </template>
  </div>
</template>
