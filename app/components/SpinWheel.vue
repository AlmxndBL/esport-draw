<script setup lang="ts">
import type { ResultKind } from '~/types'

const { unassignedTeams, spinning, result, finishDraw } = useDraw()
const toast = useToast()

const canvas = ref<HTMLCanvasElement | null>(null)
let ctx: CanvasRenderingContext2D | null = null

const SIZE = 600
const CX = SIZE / 2
const CY = SIZE / 2
const R = SIZE / 2 - 8
const TAU = Math.PI * 2
let rotation = 0
let raf = 0

function drawWheel() {
  if (!ctx) return
  const pool = unassignedTeams.value
  const n = pool.length
  ctx.clearRect(0, 0, SIZE, SIZE)

  // outer ring
  ctx.beginPath()
  ctx.arc(CX, CY, R + 4, 0, TAU)
  ctx.strokeStyle = 'rgba(34,211,238,0.35)'
  ctx.lineWidth = 6
  ctx.stroke()

  if (n === 0) {
    ctx.fillStyle = 'rgba(10,14,26,0.85)'
    ctx.beginPath()
    ctx.arc(CX, CY, R, 0, TAU)
    ctx.fill()
    ctx.fillStyle = '#8a93b8'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = '600 26px Segoe UI, sans-serif'
    ctx.fillText('ไม่มีทีมรอจับสาย', CX, CY - 14)
    ctx.font = '18px Segoe UI, sans-serif'
    ctx.fillText('เพิ่มทีมทางซ้าย', CX, CY + 20)
    return
  }

  const seg = TAU / n
  for (let i = 0; i < n; i++) {
    const start = rotation + i * seg
    const end = start + seg
    ctx.beginPath()
    ctx.moveTo(CX, CY)
    ctx.arc(CX, CY, R, start, end)
    ctx.closePath()
    ctx.fillStyle = schoolColor(pool[i]!.school)
    ctx.fill()
    ctx.fillStyle = i % 2 ? 'rgba(0,0,0,0.16)' : 'rgba(255,255,255,0.06)'
    ctx.fill()
    ctx.strokeStyle = 'rgba(10,14,26,0.6)'
    ctx.lineWidth = 2
    ctx.stroke()

    // label
    ctx.save()
    ctx.translate(CX, CY)
    ctx.rotate(start + seg / 2)
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#fff'
    ctx.shadowColor = 'rgba(0,0,0,0.6)'
    ctx.shadowBlur = 4
    ctx.font = `700 ${Math.max(12, Math.min(20, 360 / n))}px Segoe UI, Sarabun, sans-serif`
    ctx.fillText(truncate(pool[i]!.name, n > 12 ? 12 : 18), R - 18, 0)
    if (n <= 14) {
      ctx.font = '600 11px Segoe UI, Sarabun, sans-serif'
      ctx.fillStyle = 'rgba(255,255,255,0.8)'
      ctx.fillText(truncate(pool[i]!.school, 16), R - 18, 16)
    }
    ctx.restore()
  }
}

function spin() {
  if (spinning.value) return
  const pool = unassignedTeams.value
  if (pool.length === 0) {
    toast.add({ title: 'ไม่มีทีมรอจับสายแล้ว', color: 'warning', icon: 'i-lucide-circle-alert' })
    return
  }
  // single team — draw directly, no animation needed
  if (pool.length === 1) {
    finishDraw(pool[0]!)
    return
  }

  spinning.value = true
  const n = pool.length
  const seg = TAU / n
  const winnerIdx = Math.floor(Math.random() * n)
  const winner = pool[winnerIdx]!

  // rotate so the winner's segment center lands under the top pointer (3π/2)
  const targetCenter = (3 * Math.PI) / 2
  const base = targetCenter - (winnerIdx * seg + seg / 2)
  const start = ((rotation % TAU) + TAU) % TAU
  let final = ((base % TAU) + TAU) % TAU
  while (final <= start) final += TAU
  final += TAU * (5 + Math.floor(Math.random() * 3))

  const duration = 4200 + Math.random() * 800
  const t0 = performance.now()
  const ease = (t: number) => 1 - Math.pow(1 - t, 3)

  const step = (now: number) => {
    const p = Math.min(1, (now - t0) / duration)
    rotation = start + (final - start) * ease(p)
    drawWheel()
    if (p < 1) {
      raf = requestAnimationFrame(step)
    } else {
      rotation = final % TAU
      spinning.value = false
      finishDraw(winner)
    }
  }
  raf = requestAnimationFrame(step)
}

onMounted(() => {
  ctx = canvas.value?.getContext('2d') ?? null
  drawWheel()
})
onUnmounted(() => cancelAnimationFrame(raf))

// redraw when the pool changes (and we're not mid-spin)
watch(
  unassignedTeams,
  () => {
    if (!spinning.value) drawWheel()
  },
  { deep: true },
)

const alertColor: Record<ResultKind, 'neutral' | 'success' | 'warning' | 'info'> = {
  idle: 'neutral',
  ok: 'success',
  warn: 'warning',
  pick: 'info',
}
const alertIcon: Record<ResultKind, string> = {
  idle: 'i-lucide-dice-5',
  ok: 'i-lucide-circle-check',
  warn: 'i-lucide-triangle-alert',
  pick: 'i-lucide-mouse-pointer-click',
}
</script>

<template>
  <UCard :ui="{ body: 'flex flex-col items-center' }">
    <template #header>
      <h2 class="text-muted text-sm font-semibold uppercase tracking-wider">② หมุนวงล้อสุ่มทีม</h2>
    </template>

    <div class="relative aspect-square w-full max-w-[420px]">
      <!-- pointer -->
      <div
        class="absolute left-1/2 top-[-6px] z-10 -translate-x-1/2"
        style="
          width: 0;
          height: 0;
          border-left: 16px solid transparent;
          border-right: 16px solid transparent;
          border-top: 26px solid #f59e0b;
          filter: drop-shadow(0 3px 6px rgba(0, 0, 0, 0.6));
        "
      />
      <canvas
        ref="canvas"
        :width="SIZE"
        :height="SIZE"
        class="block size-full"
        style="filter: drop-shadow(0 14px 30px rgba(0, 0, 0, 0.5))"
      />
      <!-- hub -->
      <div
        class="absolute left-1/2 top-1/2 z-[2] grid size-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full text-2xl"
        style="
          background: radial-gradient(circle at 35% 30%, #2a3566, #11162e);
          border: 3px solid rgba(34, 211, 238, 0.5);
          box-shadow: 0 0 22px rgba(34, 211, 238, 0.35);
        "
      >
        🎯
      </div>
    </div>

    <UButton
      size="xl"
      color="primary"
      icon="i-lucide-rotate-cw"
      class="mt-4 px-10"
      :loading="spinning"
      :disabled="spinning || unassignedTeams.length === 0"
      @click="spin"
    >
      หมุนวงล้อ
    </UButton>

    <UAlert
      :color="alertColor[result.kind]"
      :icon="alertIcon[result.kind]"
      variant="soft"
      :description="result.text"
      class="mt-3 w-full"
    />
  </UCard>
</template>
