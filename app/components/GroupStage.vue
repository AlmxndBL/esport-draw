<script setup lang="ts">
const { groupStageViews, groupProgress, groupStageComplete, canStartKnockout, submitResult, clearResult, backToDraw, exportGroupCsv, config } =
  useTournament()
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
  clearResult(matchId)
}

function onStartKnockout() {
  const res = useTournament().startKnockout()
  if (!res.ok) toast.add({ title: res.reason ?? 'เกิดข้อผิดพลาด', color: 'error', icon: 'i-lucide-circle-alert' })
}

function onBack() {
  if (confirm('ถอยกลับสู่ขั้นจับสาย? ผลแมตช์ทั้งหมดจะถูกล้าง')) backToDraw()
}

function onExport() {
  if (!exportGroupCsv()) toast.add({ title: 'ยังไม่มีข้อมูล', color: 'warning' })
  else toast.add({ title: 'ดาวน์โหลด CSV แล้ว', color: 'success', icon: 'i-lucide-download' })
}

const progressPct = computed(() =>
  groupProgress.value.total > 0
    ? Math.round((groupProgress.value.played / groupProgress.value.total) * 100)
    : 0,
)
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h2 class="text-muted text-sm font-semibold uppercase tracking-wider">② รอบแบ่งกลุ่ม</h2>
        <div class="flex items-center gap-2">
          <UBadge color="secondary" variant="soft">
            {{ groupProgress.played }}/{{ groupProgress.total }} แมตช์
          </UBadge>
          <UBadge v-if="groupStageComplete" color="success" variant="soft" icon="i-lucide-check">
            ครบแล้ว
          </UBadge>
        </div>
      </div>
      <!-- progress bar -->
      <div class="bg-default mt-2 h-1.5 w-full overflow-hidden rounded-full">
        <div
          class="bg-primary h-full rounded-full transition-all duration-500"
          :style="{ width: `${progressPct}%` }"
        />
      </div>
    </template>

    <!-- สายทั้งหมด -->
    <div class="space-y-6">
      <div v-for="view in groupStageViews" :key="view.index">
        <!-- หัวสาย -->
        <div class="mb-3 flex items-center gap-2">
          <span class="text-highlighted text-base font-extrabold">สาย {{ view.label }}</span>
          <UBadge v-if="view.complete" color="success" variant="soft" size="xs" icon="i-lucide-check">จบแล้ว</UBadge>
        </div>

        <div class="grid gap-4 sm:grid-cols-[1fr_auto]">
          <!-- ตารางคะแนน -->
          <div class="overflow-x-auto">
            <table class="w-full text-[13px]">
              <thead>
                <tr class="text-muted border-default border-b text-left text-[11px]">
                  <th class="pb-1.5 pr-2">#</th>
                  <th class="pb-1.5 pr-4">ทีม</th>
                  <th class="pb-1.5 pr-2 text-center">แข่ง</th>
                  <th class="pb-1.5 pr-2 text-center">ชนะ</th>
                  <th class="pb-1.5 pr-2 text-center">เสมอ</th>
                  <th class="pb-1.5 pr-2 text-center">แพ้</th>
                  <th class="pb-1.5 pr-2 text-center">+/-</th>
                  <th class="pb-1.5 text-center font-bold">คะแนน</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="s in view.standings"
                  :key="s.team.id"
                  class="border-default border-b transition last:border-0"
                  :class="{ 'bg-success/5': s.qualified }"
                >
                  <td class="py-1.5 pr-2">
                    <span
                      class="inline-flex size-5 items-center justify-center rounded-full text-[11px] font-bold"
                      :class="s.qualified ? 'bg-success/20 text-success' : 'text-muted'"
                    >
                      {{ s.rank }}
                    </span>
                  </td>
                  <td class="py-1.5 pr-4">
                    <div class="flex items-center gap-1.5">
                      <span
                        class="size-2 flex-none rounded-full"
                        :style="{ background: schoolColor(s.team.school) }"
                      />
                      <span class="truncate font-semibold">{{ s.team.name }}</span>
                    </div>
                    <div class="text-muted text-[11px]">{{ s.team.school }}</div>
                  </td>
                  <td class="py-1.5 pr-2 text-center tabular-nums">{{ s.played }}</td>
                  <td class="py-1.5 pr-2 text-center tabular-nums">{{ s.won }}</td>
                  <td class="py-1.5 pr-2 text-center tabular-nums">{{ s.drawn }}</td>
                  <td class="py-1.5 pr-2 text-center tabular-nums">{{ s.lost }}</td>
                  <td class="py-1.5 pr-2 text-center tabular-nums" :class="s.diff > 0 ? 'text-success' : s.diff < 0 ? 'text-error' : 'text-muted'">
                    {{ s.diff > 0 ? '+' : '' }}{{ s.diff }}
                  </td>
                  <td class="text-highlighted py-1.5 text-center font-bold tabular-nums">{{ s.points }}</td>
                </tr>
              </tbody>
            </table>
            <p class="text-muted mt-1 text-[10px]">
              ขอบเขียว = ผ่านเข้ารอบต่อไป (top {{ config.advancePerGroup }})
            </p>
          </div>

          <!-- แมตช์แต่ละรอบ -->
          <div class="w-full sm:w-52">
            <div
              v-for="(roundMatches, rIdx) in Object.values(
                view.matches.reduce(
                  (acc, m) => {
                    const r = m.roundInGroup ?? 0
                    if (!acc[r]) acc[r] = []
                    acc[r]!.push(m)
                    return acc
                  },
                  {} as Record<number, typeof view.matches>,
                ),
              )"
              :key="rIdx"
              class="mb-3"
            >
              <p class="text-muted mb-1 text-[11px] font-semibold uppercase">รอบ {{ rIdx + 1 }}</p>
              <div class="space-y-2">
                <MatchCard
                  v-for="m in roundMatches"
                  :key="m.id"
                  :match="m"
                  :team-a="teamById(m.teamAId)"
                  :team-b="teamById(m.teamBId)"
                  @submit="(a, b) => onSubmit(m.id, a, b)"
                  @clear="onClear(m.id)"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex flex-wrap gap-2">
        <UButton
          color="primary"
          icon="i-lucide-trophy"
          :disabled="!canStartKnockout"
          @click="onStartKnockout"
        >
          เข้าสู่รอบน็อคเอาท์
        </UButton>
        <UButton color="neutral" variant="soft" size="sm" icon="i-lucide-download" @click="onExport">
          ดาวน์โหลด CSV
        </UButton>
        <UButton color="neutral" variant="soft" size="sm" icon="i-lucide-arrow-left" @click="onBack">
          กลับสู่จับสาย
        </UButton>
      </div>
      <p v-if="!canStartKnockout && !groupStageComplete" class="text-muted mt-2 text-xs">
        กรอกผลแมตช์ให้ครบก่อนจึงจะเข้ารอบน็อคเอาท์ได้
      </p>
    </template>
  </UCard>
</template>
