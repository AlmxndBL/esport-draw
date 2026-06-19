<script setup lang="ts">
// Presentational only.
</script>

<template>
  <header class="flex flex-wrap items-center justify-between gap-4">
    <div class="flex items-center gap-3.5">
      <div
        class="grid size-12 flex-none place-items-center rounded-xl text-2xl shadow-lg"
        style="background: linear-gradient(135deg, #22d3ee, #8b5cf6 55%, #f0299c)"
      >
        🎡
      </div>
      <div>
        <h1 class="text-highlighted text-xl font-bold tracking-tight sm:text-2xl">
          ระบบหมุนวงล้อจับสาย E-Sport
        </h1>
        <p class="text-muted text-sm">
          สุ่มทีมด้วยวงล้อ → จัดลงสายแข่งขัน → ตรวจกติกาโรงเรียนอัตโนมัติ
        </p>
      </div>
    </div>

    <UBadge color="primary" variant="soft" size="lg" icon="i-lucide-scale">
      กติกา: ทีมในสายเดียวกันต้องคนละโรงเรียน
    </UBadge>
  </header>
</template>
