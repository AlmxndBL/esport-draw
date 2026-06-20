<script setup lang="ts">
const {
  teams,
  unassignedTeams,
  groups,
  groupSize,
  assignedCount,
  isValidTarget,
  moveToGroup,
  autoFill,
  exportCsv,
} = useDraw()
const { canStartGroup, startGroupStage } = useTournament()
const toast = useToast()

// drag = HTML5 drag-and-drop · picked = click-to-select fallback (touch/a11y)
const dragId = ref<string | null>(null)
const pickedId = ref<string | null>(null)
const shaking = ref<number | null>(null)

const aimId = computed(() => dragId.value ?? pickedId.value)
const aimTeam = computed(() =>
  aimId.value ? (teams.value.find((t) => t.id === aimId.value) ?? null) : null,
)

/** highlight state of a group relative to the team currently being moved */
function groupState(g: number): 'valid' | 'invalid' | 'none' {
  const t = aimTeam.value
  if (!t) return 'none'
  if (teams.value.find((x) => x.id === t.id) && groups.value[g]?.members.some((m) => m.id === t.id))
    return 'none' // already in this group
  return isValidTarget(t, g) ? 'valid' : 'invalid'
}

function warnReject(g: number, reason: string) {
  shaking.value = g
  setTimeout(() => (shaking.value = null), 420)
  toast.add({ title: `วางไม่ได้: ${reason}`, color: 'warning', icon: 'i-lucide-ban' })
}

function commitMove(id: string, g: number) {
  const res = moveToGroup(id, g)
  if (!res.ok && res.reason) warnReject(g, res.reason)
  return res.ok
}

// ── drag handlers ──
function onDragStart(e: DragEvent, id: string) {
  dragId.value = id
  pickedId.value = null
  if (e.dataTransfer) {
    e.dataTransfer.setData('text/plain', id)
    e.dataTransfer.effectAllowed = 'move'
  }
}
function onDragEnd() {
  dragId.value = null
}
function onDropGroup(g: number) {
  const id = dragId.value
  dragId.value = null
  if (id) commitMove(id, g)
}
function onDropPool() {
  const id = dragId.value
  dragId.value = null
  if (id) moveToGroup(id, -1)
}

// ── click-to-select handlers ──
function onPickTeam(id: string) {
  pickedId.value = pickedId.value === id ? null : id
}
function onClickGroup(g: number) {
  const id = pickedId.value
  if (!id) return
  if (commitMove(id, g)) pickedId.value = null
}
function onClickPool() {
  const id = pickedId.value
  if (!id) return
  moveToGroup(id, -1)
  pickedId.value = null
}

function onAutoFill() {
  const { placed } = autoFill()
  if (placed === 0)
    toast.add({ title: 'ไม่มีทีมที่จัดได้', color: 'warning', icon: 'i-lucide-circle-alert' })
}
function onExport() {
  if (!exportCsv())
    toast.add({ title: 'ยังไม่มีทีมให้ export', color: 'warning', icon: 'i-lucide-circle-alert' })
  else toast.add({ title: 'ดาวน์โหลด CSV แล้ว', color: 'success', icon: 'i-lucide-download' })
}
function onStartGroup() {
  const res = startGroupStage()
  if (!res.ok)
    toast.add({ title: `เริ่มไม่ได้: ${res.reason}`, color: 'error', icon: 'i-lucide-circle-alert' })
}

function emptySlots(memberCount: number) {
  return groupSize.value > 0 ? Math.max(0, groupSize.value - memberCount) : 0
}
</script>

<template>
  <UCard :ui="{ body: 'space-y-4' }">
    <template #header>
      <div class="flex items-center justify-between">
        <h2 class="text-muted text-sm font-semibold uppercase tracking-wider">② จัดทีมลงสายเอง</h2>
        <UBadge color="secondary" variant="soft">{{ assignedCount }} จัดแล้ว</UBadge>
      </div>
    </template>

    <!-- pool (drag source + drop target for returning teams) -->
    <div
      class="border-default bg-elevated/30 rounded-xl border border-dashed p-3 transition"
      :class="{ 'border-primary/60 bg-primary/5': dragId }"
      @dragover.prevent
      @dragenter.prevent
      @drop.prevent="onDropPool"
      @click="onClickPool"
    >
      <p class="text-muted mb-2 text-xs">
        ทีมที่รอจับสาย ({{ unassignedTeams.length }}) — ลากไปวางในสาย หรือแตะเพื่อเลือกแล้วแตะสาย
      </p>
      <p v-if="unassignedTeams.length === 0" class="text-muted py-3 text-center text-sm">
        — จัดครบทุกทีมแล้ว —
      </p>
      <div v-else class="flex flex-wrap gap-2">
        <button
          v-for="t in unassignedTeams"
          :key="t.id"
          type="button"
          draggable="true"
          class="flex cursor-grab items-center gap-2 rounded-lg border px-2.5 py-1.5 text-sm transition active:cursor-grabbing"
          :class="
            pickedId === t.id
              ? 'border-primary bg-primary/10 ring-2 ring-cyan-500/40'
              : 'border-default bg-elevated/60 hover:border-primary/50'
          "
          @dragstart="onDragStart($event, t.id)"
          @dragend="onDragEnd"
          @click.stop="onPickTeam(t.id)"
        >
          <span class="size-2.5 flex-none rounded-full" :style="{ background: schoolColor(t.school) }" />
          <span class="font-semibold">{{ t.name }}</span>
          <span class="text-muted text-[11px]">· {{ t.school }}</span>
        </button>
      </div>
    </div>

    <!-- groups (drop targets) -->
    <div class="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3">
      <div
        v-for="g in groups"
        :key="g.index"
        class="group-card bg-elevated/50 border-default rounded-xl border p-3 transition"
        :class="{
          valid: groupState(g.index) === 'valid',
          invalid: groupState(g.index) === 'invalid',
          shake: shaking === g.index,
        }"
        @dragover.prevent
        @dragenter.prevent
        @drop.prevent="onDropGroup(g.index)"
        @click="onClickGroup(g.index)"
      >
        <div class="mb-2 flex items-center justify-between gap-1.5">
          <span class="text-highlighted text-[15px] font-extrabold">สาย {{ g.label }}</span>
          <span class="text-xs" :class="g.full ? 'text-warning' : 'text-muted'">
            {{ g.members.length }}{{ groupSize > 0 ? `/${groupSize}` : '' }}{{ g.full ? ' เต็ม' : '' }}
          </span>
        </div>

        <!-- members (draggable: move between groups / back to pool) -->
        <div
          v-for="m in g.members"
          :key="m.id"
          role="button"
          tabindex="0"
          draggable="true"
          class="mb-1.5 flex w-full cursor-grab items-center gap-2 rounded-lg bg-white/[0.04] px-2 py-1.5 text-left text-[13px] transition active:cursor-grabbing"
          :class="{ 'ring-2 ring-cyan-500/40': pickedId === m.id }"
          @dragstart="onDragStart($event, m.id)"
          @dragend="onDragEnd"
          @click.stop="onPickTeam(m.id)"
          @keydown.enter.stop="onPickTeam(m.id)"
        >
          <span class="size-2.5 flex-none rounded-full" :style="{ background: schoolColor(m.school) }" />
          <span class="min-w-0 flex-1 truncate">
            {{ m.name }}
            <span class="text-muted text-[11px]">· {{ m.school }}</span>
          </span>
          <button
            type="button"
            class="text-muted hover:text-error cursor-pointer"
            :aria-label="`คืน ${m.name} กลับกอง`"
            title="คืนทีมกลับกอง"
            @click.stop="moveToGroup(m.id, -1)"
          >
            ↩
          </button>
        </div>

        <!-- empty slots -->
        <div
          v-for="i in emptySlots(g.members.length)"
          :key="`empty-${i}`"
          class="border-default text-muted mb-1.5 rounded-lg border border-dashed px-2 py-1.5 text-center text-[13px]"
        >
          ว่าง
        </div>
        <div
          v-if="g.members.length === 0 && emptySlots(0) === 0"
          class="border-default text-muted rounded-lg border border-dashed px-2 py-1.5 text-center text-[13px]"
        >
          ว่าง
        </div>

        <!-- status -->
        <div v-if="g.hasDupe" class="text-error mt-1.5 text-[11.5px]">⚠ มีโรงเรียนซ้ำในสาย!</div>
        <div v-else-if="g.members.length > 0" class="text-success mt-1.5 text-[11.5px]">
          ✓ ทุกทีมคนละโรงเรียน
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex flex-wrap gap-2">
        <UButton color="neutral" variant="soft" size="sm" icon="i-lucide-zap" @click="onAutoFill">
          จัดที่เหลือทั้งหมด
        </UButton>
        <UButton color="neutral" variant="soft" size="sm" icon="i-lucide-download" @click="onExport">
          ดาวน์โหลด CSV
        </UButton>
        <UButton
          color="primary"
          size="sm"
          icon="i-lucide-play"
          :disabled="!canStartGroup"
          :title="canStartGroup ? 'เริ่มรอบแบ่งกลุ่ม' : 'ต้องมีทีมอย่างน้อย 2 ทีมต่อสาย'"
          @click="onStartGroup"
        >
          เริ่มรอบแบ่งกลุ่ม
        </UButton>
      </div>
      <p class="text-muted mt-2 text-xs leading-relaxed">
        การ์ดสาย <span class="text-success">ขอบเขียว</span> = วางได้ ·
        <span class="text-error">ขอบแดง</span> = วางไม่ได้ (โรงเรียนซ้ำหรือเต็ม)
      </p>
    </template>
  </UCard>
</template>

<style scoped>
.group-card.valid {
  cursor: pointer;
  border-color: #22c55e;
  box-shadow:
    0 0 0 2px rgba(34, 197, 94, 0.25),
    0 0 22px rgba(34, 197, 94, 0.18);
}
.group-card.invalid {
  opacity: 0.5;
  border-color: rgba(244, 63, 94, 0.5);
}
.group-card.shake {
  animation: shake 0.4s;
}
@keyframes shake {
  0%,
  100% {
    transform: translateX(0);
  }
  20%,
  60% {
    transform: translateX(-7px);
  }
  40%,
  80% {
    transform: translateX(7px);
  }
}
</style>
