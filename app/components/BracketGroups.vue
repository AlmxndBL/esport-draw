<script setup lang="ts">
const {
  groups,
  lastDrawn,
  groupSize,
  autoAssign,
  currentGroupIndex,
  assignedCount,
  clickGroup,
  returnToPool,
  autoFill,
  exportCsv,
} = useDraw()
const { canStartGroup, startGroupStage } = useTournament()

// The bracket being filled next (auto mode only, when nothing awaits manual placement).
function isCurrent(index: number) {
  return autoAssign.value && !lastDrawn.value && currentGroupIndex.value === index
}

const toast = useToast()
const shaking = ref<number | null>(null)

function onStartGroup() {
  const res = startGroupStage()
  if (!res.ok) {
    toast.add({ title: `เริ่มไม่ได้: ${res.reason}`, color: 'error', icon: 'i-lucide-circle-alert' })
  }
}

function onClickGroup(index: number) {
  if (!lastDrawn.value) return
  const res = clickGroup(index)
  if (!res.ok && res.reason) {
    shaking.value = index
    setTimeout(() => (shaking.value = null), 420)
    toast.add({ title: `วางไม่ได้: ${res.reason}`, color: 'warning', icon: 'i-lucide-ban' })
  }
}

function onExport() {
  if (!exportCsv()) {
    toast.add({ title: 'ยังไม่มีทีมให้ export', color: 'warning', icon: 'i-lucide-circle-alert' })
    return
  }
  toast.add({ title: 'ดาวน์โหลด CSV แล้ว', color: 'success', icon: 'i-lucide-download' })
}

function onAutoFill() {
  const { placed } = autoFill()
  if (placed === 0)
    toast.add({ title: 'ไม่มีทีมที่จัดได้', color: 'warning', icon: 'i-lucide-circle-alert' })
}

// empty-slot placeholders shown after the real members when a size cap is set
function emptySlots(memberCount: number) {
  return groupSize.value > 0 ? Math.max(0, groupSize.value - memberCount) : 0
}
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <h2 class="text-muted text-sm font-semibold uppercase tracking-wider">③ สายการแข่งขัน</h2>
        <UBadge color="secondary" variant="soft">{{ assignedCount }} จัดแล้ว</UBadge>
      </div>
    </template>

    <div class="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
      <div
        v-for="g in groups"
        :key="g.index"
        class="group-card bg-elevated/50 border-default rounded-xl border p-3 transition"
        :class="{
          valid: lastDrawn && g.isValidTarget,
          invalid: lastDrawn && !g.isValidTarget,
          current: isCurrent(g.index),
          shake: shaking === g.index,
        }"
        @click="onClickGroup(g.index)"
      >
        <div class="mb-2 flex items-center justify-between gap-1.5">
          <span class="text-highlighted text-[15px] font-extrabold">สาย {{ g.label }}</span>
          <span v-if="isCurrent(g.index)" class="text-primary mr-auto text-[10px] font-bold">
            ● กำลังเติม
          </span>
          <span class="text-xs" :class="g.full ? 'text-warning' : 'text-muted'">
            {{ g.members.length }}{{ groupSize > 0 ? `/${groupSize}` : '' }}{{ g.full ? ' เต็ม' : '' }}
          </span>
        </div>

        <!-- members -->
        <div
          v-for="m in g.members"
          :key="m.id"
          class="mb-1.5 flex items-center gap-2 rounded-lg bg-white/[0.04] px-2 py-1.5 text-[13px]"
        >
          <span
            class="size-2.5 flex-none rounded-full"
            :style="{ background: schoolColor(m.school) }"
          />
          <span class="min-w-0 flex-1 truncate">
            {{ m.name }}
            <span class="text-muted text-[11px]">· {{ m.school }}</span>
          </span>
          <span
            class="text-muted hover:text-error cursor-pointer"
            title="คืนทีม"
            @click.stop="returnToPool(m.id)"
          >
            ↩
          </span>
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
        <div
          v-if="g.members.length === 0"
          class="text-muted mt-1.5 text-[11.5px]"
        >
          ยังไม่มีทีม
        </div>
        <div v-else-if="g.hasDupe" class="text-error mt-1.5 flex items-center gap-1 text-[11.5px]">
          ⚠ มีโรงเรียนซ้ำในสาย!
        </div>
        <div v-else class="text-success mt-1.5 flex items-center gap-1 text-[11.5px]">
          ✓ ทุกทีมคนละโรงเรียน
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex flex-wrap gap-2">
        <UButton color="neutral" variant="soft" size="sm" icon="i-lucide-download" @click="onExport">
          ดาวน์โหลด CSV
        </UButton>
        <UButton color="neutral" variant="soft" size="sm" icon="i-lucide-zap" @click="onAutoFill">
          จัดที่เหลือทั้งหมด
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
        การ์ดสายที่ <span class="text-success">ขอบเขียว</span> = วางทีมที่สุ่มได้ลงได้ (คนละโรงเรียน) ·
        การ์ดจาง = วางไม่ได้ (มีโรงเรียนซ้ำหรือเต็ม)
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
.group-card.valid:hover {
  transform: translateY(-2px);
}
.group-card.invalid {
  opacity: 0.45;
}
.group-card.current {
  border-color: #22d3ee;
  box-shadow:
    0 0 0 1px rgba(34, 211, 238, 0.3),
    0 0 18px rgba(34, 211, 238, 0.12);
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
