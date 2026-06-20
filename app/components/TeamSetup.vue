<script setup lang="ts">
const {
  teams,
  numGroups,
  groupSize,
  autoAssign,
  unassignedTeams,
  schools,
  addTeam,
  removeTeam,
  loadSample,
  returnAll,
  reset,
} = useDraw()
const { locked } = useTournament()

const toast = useToast()

const name = ref('')
const school = ref('')

const groupOptions = [2, 3, 4, 5, 6, 8].map((n) => ({ label: `${n} สาย`, value: n }))
const sizeOptions = [
  { label: 'ไม่จำกัด', value: 0 },
  ...[2, 3, 4, 5, 6].map((n) => ({ label: `${n} ทีม/สาย`, value: n })),
]

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

    <!-- config -->
    <div class="mt-4 grid grid-cols-2 gap-3">
      <UFormField label="จำนวนสาย">
        <USelect v-model="numGroups" :items="groupOptions" class="w-full" :disabled="locked" />
      </UFormField>
      <UFormField label="ทีมต่อสาย (สูงสุด)">
        <USelect v-model="groupSize" :items="sizeOptions" class="w-full" :disabled="locked" />
      </UFormField>
    </div>

    <USwitch
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

    <!-- pool list -->
    <div class="mt-4">
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
