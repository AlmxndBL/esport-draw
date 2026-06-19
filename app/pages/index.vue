<script setup lang="ts">
// Composition root — wires the three panels together. All logic lives in useDraw().
useHead({ title: 'ระบบหมุนวงล้อจับสาย E-Sport' })
</script>

<template>
  <UContainer class="py-6">
    <AppHeader class="mb-5" />

    <div class="grid gap-4 lg:grid-cols-[320px_minmax(360px,1fr)_minmax(320px,1.1fr)]">
      <TeamSetup />
      <SpinWheel />
      <BracketGroups />
    </div>
  </UContainer>
</template>
