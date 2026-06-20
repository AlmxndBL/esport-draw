<script setup lang="ts">
import type { Match, Team } from '~/types'

const props = defineProps<{
  match: Match
  teamA: Team | null
  teamB: Team | null
  readonly?: boolean
}>()

const emit = defineEmits<{
  submit: [scoreA: number, scoreB: number]
  clear: []
}>()

const scoreA = ref<number | null>(props.match.scoreA)
const scoreB = ref<number | null>(props.match.scoreB)

watch(
  () => props.match,
  (m) => {
    scoreA.value = m.scoreA
    scoreB.value = m.scoreB
  },
)

function onSubmit() {
  if (scoreA.value == null || scoreB.value == null) return
  emit('submit', scoreA.value, scoreB.value)
}

const winnerIsA = computed(() => props.match.played && props.match.winnerId === props.match.teamAId)
const winnerIsB = computed(() => props.match.played && props.match.winnerId === props.match.teamBId)
const isDraw = computed(
  () => props.match.played && props.match.winnerId === null && props.match.scoreA !== null,
)
const isBye = computed(
  () =>
    props.match.played &&
    (props.match.teamAId === null || props.match.teamBId === null),
)
</script>

<template>
  <div
    class="border-default bg-elevated/40 rounded-xl border p-3 text-sm transition"
    :class="{ 'border-success/40': match.played && !isBye }"
  >
    <!-- ทีม A -->
    <div
      class="flex items-center gap-2 rounded-lg px-2 py-1.5 transition"
      :class="{
        'bg-success/10 font-semibold': winnerIsA,
        'opacity-40': match.played && !winnerIsA && !isDraw,
      }"
    >
      <span
        v-if="teamA"
        class="size-2.5 flex-none rounded-full"
        :style="{ background: schoolColor(teamA.school) }"
      />
      <span class="min-w-0 flex-1 truncate">
        {{ teamA?.name ?? 'TBD' }}
        <span v-if="teamA" class="text-muted text-[11px]">· {{ teamA.school }}</span>
      </span>
      <span v-if="match.played" class="text-highlighted font-bold tabular-nums">
        {{ match.scoreA ?? '' }}
      </span>
    </div>

    <!-- vs divider -->
    <div class="text-muted my-1 px-2 text-center text-[11px]">
      <template v-if="isBye">
        <span class="text-secondary text-[11px] font-semibold">BYE — ผ่านอัตโนมัติ</span>
      </template>
      <template v-else-if="isDraw">
        <span class="text-warning font-semibold">เสมอ</span>
      </template>
      <template v-else>vs</template>
    </div>

    <!-- ทีม B -->
    <div
      class="flex items-center gap-2 rounded-lg px-2 py-1.5 transition"
      :class="{
        'bg-success/10 font-semibold': winnerIsB,
        'opacity-40': match.played && !winnerIsB && !isDraw,
      }"
    >
      <span
        v-if="teamB"
        class="size-2.5 flex-none rounded-full"
        :style="{ background: schoolColor(teamB.school) }"
      />
      <span class="min-w-0 flex-1 truncate">
        {{ teamB?.name ?? 'TBD' }}
        <span v-if="teamB" class="text-muted text-[11px]">· {{ teamB?.school }}</span>
      </span>
      <span v-if="match.played" class="text-highlighted font-bold tabular-nums">
        {{ match.scoreB ?? '' }}
      </span>
    </div>

    <!-- กรอกผล (ไม่ใช่ read-only, ไม่ใช่ bye) -->
    <template v-if="!readonly && !isBye && teamA && teamB">
      <div class="mt-2.5 flex items-center gap-1.5">
        <UInput
          v-model.number="scoreA"
          type="number"
          min="0"
          placeholder="0"
          :ui="{ base: 'text-center' }"
          class="w-14"
          @keydown.enter="onSubmit"
        />
        <span class="text-muted flex-1 text-center text-xs">–</span>
        <UInput
          v-model.number="scoreB"
          type="number"
          min="0"
          placeholder="0"
          :ui="{ base: 'text-center' }"
          class="w-14"
          @keydown.enter="onSubmit"
        />
        <UButton size="xs" color="primary" icon="i-lucide-check" @click="onSubmit" />
        <UButton
          v-if="match.played"
          size="xs"
          color="neutral"
          variant="ghost"
          icon="i-lucide-x"
          title="ล้างผล"
          @click="$emit('clear')"
        />
      </div>
    </template>
  </div>
</template>
