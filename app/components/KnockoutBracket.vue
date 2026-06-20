<script setup lang="ts">
const {
  bracketRounds,
  champion,
  stage,
  submitResult,
  clearResult,
  backToGroup,
  backToDraw,
  exportBracketCsv,
} = useTournament()
const { teams } = useDraw()
const toast = useToast()

function teamById(id: string | null) {
  return id ? (teams.value.find((t) => t.id === id) ?? null) : null
}

function onSubmit(matchId: string, scoreA: number, scoreB: number) {
  const res = submitResult(matchId, scoreA, scoreB)
  if (!res.ok) toast.add({ title: res.reason ?? 'เกิดข้อผิดพลาด', color: 'error', icon: 'i-lucide-circle-alert' })
}

function onClear(matchId: string) {
  if (confirm('ล้างผลแมตช์นี้? แมตช์ที่ผู้ชนะผ่านต่อไปแล้วจะถูกล้างด้วย')) {
    clearResult(matchId)
  }
}

function onBackToGroup() {
  if (confirm('ถอยกลับสู่รอบแบ่งกลุ่ม? ผลรอบน็อคเอาท์ทั้งหมดจะถูกล้าง')) backToGroup()
}

function onBackToDraw() {
  if (confirm('ถอยกลับสู่จับสาย? ผลทั้งหมดจะถูกล้าง')) backToDraw()
}

function onExport() {
  if (!exportBracketCsv()) toast.add({ title: 'ยังไม่มีข้อมูล', color: 'warning' })
  else toast.add({ title: 'ดาวน์โหลด CSV แล้ว', color: 'success', icon: 'i-lucide-download' })
}
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h2 class="text-muted text-sm font-semibold uppercase tracking-wider">
          {{ stage === 'champion' ? '🏆 ผลการแข่งขัน' : '③ รอบน็อคเอาท์' }}
        </h2>
        <UBadge v-if="stage === 'champion'" color="success" variant="soft" icon="i-lucide-trophy">
          จบการแข่งขัน
        </UBadge>
      </div>
    </template>

    <!-- แบนเนอร์แชมป์ -->
    <div
      v-if="champion"
      class="mb-6 rounded-2xl border border-amber-400/40 bg-gradient-to-r from-amber-500/10 to-yellow-500/5 p-5 text-center"
      style="box-shadow: 0 0 40px rgba(251,191,36,0.15)"
    >
      <div class="mb-1 text-4xl">🏆</div>
      <div class="text-highlighted text-2xl font-extrabold">{{ champion.name }}</div>
      <div class="mt-1 flex items-center justify-center gap-2">
        <span
          class="size-3 rounded-full"
          :style="{ background: schoolColor(champion.school) }"
        />
        <span class="text-muted text-sm">{{ champion.school }}</span>
      </div>
      <UBadge color="warning" variant="soft" class="mt-3">แชมป์การแข่งขัน</UBadge>
    </div>

    <!-- bracket grid — scroll-x บนจอเล็ก -->
    <div class="overflow-x-auto pb-4">
      <div
        class="flex gap-6"
        :style="{ minWidth: `${bracketRounds.length * 220}px` }"
      >
        <div
          v-for="round in bracketRounds"
          :key="round.round"
          class="flex flex-1 flex-col"
        >
          <!-- หัวรอบ -->
          <p class="text-muted mb-3 text-center text-[11px] font-semibold uppercase tracking-wider">
            {{ round.label }}
          </p>

          <!-- แมตช์ในรอบ — กระจายแนวตั้งให้สม่ำเสมอ -->
          <div class="flex flex-1 flex-col justify-around gap-3">
            <MatchCard
              v-for="m in round.matches"
              :key="m.id"
              :match="m"
              :team-a="teamById(m.teamAId)"
              :team-b="teamById(m.teamBId)"
              :readonly="stage === 'champion' && round.round < bracketRounds.length - 1"
              @submit="(a, b) => onSubmit(m.id, a, b)"
              @clear="onClear(m.id)"
            />
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex flex-wrap gap-2">
        <UButton color="neutral" variant="soft" size="sm" icon="i-lucide-download" @click="onExport">
          ดาวน์โหลด CSV
        </UButton>
        <UButton color="neutral" variant="soft" size="sm" icon="i-lucide-arrow-left" @click="onBackToGroup">
          กลับรอบแบ่งกลุ่ม
        </UButton>
        <UButton color="error" variant="soft" size="sm" icon="i-lucide-rotate-ccw" @click="onBackToDraw">
          เริ่มใหม่ทั้งหมด
        </UButton>
      </div>
    </template>
  </UCard>
</template>
