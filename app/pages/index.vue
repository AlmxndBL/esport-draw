<script setup lang="ts">
useHead({ title: 'ระบบหมุนวงล้อจับสาย E-Sport' })
const { stage } = useTournament()
</script>

<template>
  <UContainer class="py-6">
    <AppHeader class="mb-5" />
    <StageStepper class="mb-5" />

    <template v-if="stage === 'draw'">
      <div class="grid gap-4 lg:grid-cols-[320px_minmax(360px,1fr)_minmax(320px,1.1fr)]">
        <TeamSetup />
        <SpinWheel />
        <BracketGroups />
      </div>
    </template>

    <GroupStage v-else-if="stage === 'group'" />

    <KnockoutBracket v-else />
  </UContainer>
</template>
