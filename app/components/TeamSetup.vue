<script setup lang="ts">
const {
  teams,
  numGroups,
  groupSize,
  autoAssign,
  drawMode,
  unassignedTeams,
  schools,
  maxPerSchool,
  minGroupsRequired,
  addTeam,
  importTeams,
  removeTeam,
  loadSample,
  returnAll,
  reset,
  autoGenerate,
  distributeAll,
  pruneAssignmentsToGroupCount,
} = useDraw()
const { locked } = useTournament()

const toast = useToast()

const name = ref('')
const school = ref('')
const fileInput = ref<HTMLInputElement | null>(null)

// auto-generate: target teams-per-group (0 = unlimited / fewest groups)
const targetSize = ref(4)
const genGroups = computed(() => {
  const total = teams.value.length
  const byCap = targetSize.value > 0 ? Math.ceil(total / targetSize.value) : 0
  return Math.max(byCap, minGroupsRequired.value, 1)
})

// the school rule needs at least `minGroupsRequired` groups — warn if below it
const tooFewGroups = computed(() => teams.value.length > 0 && numGroups.value < minGroupsRequired.value)

// Commit handlers (run on blur/@change, NOT per-keystroke). Round to a safe integer,
// then prune released groups exactly once on the final value.
function clampGroups() {
  const n = Math.floor(Number(numGroups.value))
  numGroups.value = Number.isFinite(n) && n >= 1 ? n : 1
  pruneAssignmentsToGroupCount()
}
function clampSize() {
  const s = Math.floor(Number(groupSize.value))
  groupSize.value = Number.isFinite(s) && s >= 0 ? s : 0
}

function onAutoGenerate() {
  if (teams.value.length === 0) {
    toast.add({ title: 'ยังไม่มีทีมให้จัด', color: 'warning', icon: 'i-lucide-circle-alert' })
    return
  }
  const { groups, failed } = autoGenerate(targetSize.value)
  toast.add({
    title: `สร้าง ${groups} สายแล้ว${failed ? ` · เหลือ ${failed} ทีมติดกติกา` : ''}`,
    color: failed ? 'warning' : 'success',
    icon: failed ? 'i-lucide-triangle-alert' : 'i-lucide-wand-2',
  })
}

function onRedistribute() {
  if (teams.value.length === 0) return
  const { failed } = distributeAll()
  toast.add({
    title: failed ? `จัดใหม่แล้ว · เหลือ ${failed} ทีมติดกติกา` : 'จัดทีมใหม่ให้สมดุลแล้ว',
    color: failed ? 'warning' : 'success',
    icon: 'i-lucide-shuffle',
  })
}

function onAdd() {
  const error = addTeam(name.value, school.value)
  if (error) {
    toast.add({ title: error, color: 'error', icon: 'i-lucide-circle-alert' })
    return
  }
  name.value = ''
  school.value = ''
}

function onReset() {
  if (confirm('ล้างทีมและสายทั้งหมด?')) reset()
}

// ── CSV import ──
function triggerImport() {
  fileInput.value?.click()
}

async function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  try {
    const text = await file.text()
    const entries = teamsFromCsvRows(parseCsv(text))
    if (entries.length === 0) {
      toast.add({
        title: 'ไม่พบข้อมูลทีมในไฟล์',
        description: 'ต้องมีคอลัมน์ชื่อทีม และโรงเรียน',
        color: 'warning',
        icon: 'i-lucide-file-x',
      })
      return
    }
    const { added, skipped } = importTeams(entries)
    toast.add({
      title: `นำเข้า ${added} ทีม${skipped > 0 ? ` · ข้าม ${skipped} (ซ้ำ/ไม่ครบ)` : ''}`,
      color: added > 0 ? 'success' : 'warning',
      icon: 'i-lucide-file-check',
    })
  } catch {
    toast.add({ title: 'อ่านไฟล์ไม่สำเร็จ', color: 'error', icon: 'i-lucide-circle-alert' })
  } finally {
    input.value = '' // allow re-importing the same file
  }
}

function downloadTemplate() {
  downloadFile('esport-teams-template.csv', csvTemplate())
}
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <h2 class="text-muted text-sm font-semibold uppercase tracking-wider">
          ① ตั้งค่า &amp; รายชื่อทีม
        </h2>
        <div class="flex items-center gap-2">
          <UBadge v-if="locked" color="warning" variant="soft" icon="i-lucide-lock">
            ล็อกระหว่างแข่ง
          </UBadge>
          <UBadge color="secondary" variant="soft">{{ teams.length }} ทีม</UBadge>
        </div>
      </div>
    </template>

    <!-- add team -->
    <UFormField label="เพิ่มทีมเข้าระบบ">
      <div class="space-y-2">
        <UInput
          v-model="name"
          placeholder="ชื่อทีม เช่น Dragon Squad"
          icon="i-lucide-users"
          class="w-full"
          :disabled="locked"
          @keydown.enter="onAdd"
        />
        <div class="flex gap-2">
          <UInput
            v-model="school"
            placeholder="โรงเรียน เช่น ร.ร.สวนกุหลาบ"
            icon="i-lucide-graduation-cap"
            class="flex-1"
            :ui="{ root: 'w-full' }"
            list="school-list"
            :disabled="locked"
            @keydown.enter="onAdd"
          />
          <UButton icon="i-lucide-plus" color="primary" :disabled="locked" @click="onAdd">เพิ่ม</UButton>
        </div>
        <datalist id="school-list">
          <option v-for="s in schools" :key="s" :value="s" />
        </datalist>
      </div>
    </UFormField>

    <!-- CSV import -->
    <div class="mt-3 flex flex-wrap items-center gap-2">
      <input
        ref="fileInput"
        type="file"
        accept=".csv,text/csv"
        class="hidden"
        @change="onFileChange"
      />
      <UButton
        color="primary"
        variant="soft"
        size="sm"
        icon="i-lucide-file-up"
        :disabled="locked"
        @click="triggerImport"
      >
        นำเข้า CSV
      </UButton>
      <UButton
        color="neutral"
        variant="ghost"
        size="sm"
        icon="i-lucide-file-down"
        @click="downloadTemplate"
      >
        เทมเพลต
      </UButton>
      <span class="text-muted text-[11px]">คอลัมน์: ชื่อทีม, โรงเรียน</span>
    </div>

    <!-- config — free numeric inputs (unlimited groups & size) -->
    <div class="mt-4 grid grid-cols-2 gap-3">
      <UFormField label="จำนวนสาย" help="ไม่จำกัด">
        <UInput
          v-model.number="numGroups"
          type="number"
          min="1"
          class="w-full"
          :disabled="locked"
          @change="clampGroups"
        />
      </UFormField>
      <UFormField label="ทีมต่อสาย" help="0 = ไม่จำกัด">
        <UInput
          v-model.number="groupSize"
          type="number"
          min="0"
          class="w-full"
          :disabled="locked"
          @change="clampSize"
        />
      </UFormField>
    </div>

    <!-- rule-floor warning -->
    <UAlert
      v-if="tooFewGroups"
      color="warning"
      variant="soft"
      icon="i-lucide-triangle-alert"
      class="mt-3"
      :title="`ต้องมีอย่างน้อย ${minGroupsRequired} สาย`"
      :description="`มีโรงเรียนที่ส่ง ${maxPerSchool} ทีม — สายต้องไม่น้อยกว่านี้ ไม่งั้นจัดทีมไม่ครบ`"
    />

    <!-- auto-generate from total teams -->
    <div class="border-default bg-elevated/40 mt-3 rounded-xl border p-3">
      <p class="text-highlighted mb-2 flex items-center gap-1.5 text-xs font-semibold">
        <UIcon name="i-lucide-wand-2" class="text-primary size-4" />
        สร้างสายอัตโนมัติจากจำนวนทีม
      </p>
      <div class="flex items-end gap-2">
        <UFormField label="ทีม/สาย (โดยประมาณ)" class="flex-1">
          <UInput v-model.number="targetSize" type="number" min="0" class="w-full" :disabled="locked" />
        </UFormField>
        <UButton color="primary" icon="i-lucide-sparkles" :disabled="locked" @click="onAutoGenerate">
          สร้าง
        </UButton>
      </div>
      <p class="text-muted mt-2 text-[11px]">
        {{ teams.length }} ทีม → <span class="text-primary font-semibold">{{ genGroups }} สาย</span>
        · กระจายทุกทีมแบบสมดุลและคนละโรงเรียน
      </p>
      <UButton
        color="neutral"
        variant="ghost"
        size="xs"
        icon="i-lucide-shuffle"
        class="mt-1"
        :disabled="locked"
        @click="onRedistribute"
      >
        จัดทีมใหม่ให้สมดุล (ใช้สายเดิม)
      </UButton>
    </div>

    <USwitch
      v-if="drawMode === 'wheel'"
      v-model="autoAssign"
      class="mt-4"
      label="เติมทีละสายอัตโนมัติหลังหมุน"
      description="เติมสายปัจจุบันให้เต็มก่อน ถ้าโรงเรียนซ้ำจะข้ามไปสายถัดไปทันที"
      :disabled="locked"
    />

    <!-- stats -->
    <div class="mt-4 grid grid-cols-3 gap-2">
      <div class="bg-elevated/50 border-default rounded-lg border p-2.5 text-center">
        <div class="text-highlighted text-xl font-bold">{{ teams.length }}</div>
        <div class="text-muted text-xs">ทีมทั้งหมด</div>
      </div>
      <div class="bg-elevated/50 border-default rounded-lg border p-2.5 text-center">
        <div class="text-highlighted text-xl font-bold">{{ unassignedTeams.length }}</div>
        <div class="text-muted text-xs">รอจับสาย</div>
      </div>
      <div class="bg-elevated/50 border-default rounded-lg border p-2.5 text-center">
        <div class="text-highlighted text-xl font-bold">{{ schools.length }}</div>
        <div class="text-muted text-xs">โรงเรียน</div>
      </div>
    </div>

    <!-- bulk actions -->
    <div class="mt-3 flex flex-wrap gap-2">
      <UButton color="neutral" variant="soft" size="sm" icon="i-lucide-clipboard-list" :disabled="locked" @click="loadSample">
        ข้อมูลตัวอย่าง
      </UButton>
      <UButton color="neutral" variant="soft" size="sm" icon="i-lucide-undo-2" :disabled="locked" @click="returnAll">
        คืนทุกทีม
      </UButton>
      <UButton color="error" variant="soft" size="sm" icon="i-lucide-trash-2" :disabled="locked" @click="onReset">
        ล้างทั้งหมด
      </UButton>
    </div>

    <!-- pool list (wheel mode only — manual mode shows a draggable pool instead) -->
    <div v-if="drawMode === 'wheel'" class="mt-4">
      <p class="text-muted mb-2 text-xs">ทีมที่รอจับสาย</p>
      <div class="max-h-72 space-y-1.5 overflow-y-auto pr-1">
        <p v-if="unassignedTeams.length === 0" class="text-muted py-6 text-center text-sm">
          — ไม่มีทีมรอจับสาย —
        </p>
        <div
          v-for="t in unassignedTeams"
          :key="t.id"
          class="bg-elevated/50 border-default flex items-center gap-2.5 rounded-lg border px-2.5 py-2"
        >
          <span
            class="size-2.5 flex-none rounded-full"
            :style="{ background: schoolColor(t.school), boxShadow: `0 0 8px ${schoolColor(t.school)}` }"
          />
          <div class="min-w-0 flex-1">
            <div class="text-default truncate text-sm font-semibold">{{ t.name }}</div>
            <div class="text-muted text-xs">{{ t.school }}</div>
          </div>
          <UButton
            color="neutral"
            variant="ghost"
            size="xs"
            icon="i-lucide-x"
            :aria-label="`ลบ ${t.name}`"
            @click="removeTeam(t.id)"
          />
        </div>
      </div>
    </div>
  </UCard>
</template>
