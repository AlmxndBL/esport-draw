<script setup lang="ts">
useHead({ title: 'ระบบหมุนวงล้อจับสาย E-Sport' })
const { stage } = useTournament()
const { drawMode } = useDraw()
</script>

<template>
  <UContainer class="py-6">
    <AppHeader class="mb-5" />
    <StageStepper class="mb-5" />

    <template v-if="stage === 'draw'">
      <DrawModeToggle class="mb-4" />

      <div
        v-if="drawMode === 'wheel'"
        class="grid gap-4 lg:grid-cols-[320px_minmax(360px,1fr)_minmax(320px,1.1fr)]"
      >
        <TeamSetup />
        <SpinWheel />
        <BracketGroups />
      </div>

      <div v-else class="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <TeamSetup />
        <ManualAssign />
      </div>
    </template>

    <GroupStage v-else-if="stage === 'group'" />

    <KnockoutBracket v-else />
  </UContainer>
</template>
