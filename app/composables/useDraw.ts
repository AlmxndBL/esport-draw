import { useStorage } from '@vueuse/core'
import type { Team, GroupView, ResultMessage, DrawMode } from '~/types'

/**
 * Single source of truth for the draw system: team pool, group assignments,
 * configuration, and — most importantly — the school constraint rules.
 *
 * Persistent state is backed by localStorage via VueUse `useStorage`.
 * Implemented as a lazy singleton so every component shares one store.
 */
function createDrawStore() {
  // --- persisted state ---
  const teams = useStorage<Team[]>('esport-draw.teams', [])
  const assignments = useStorage<Record<string, number>>('esport-draw.assignments', {})
  const numGroups = useStorage<number>('esport-draw.numGroups', 4)
  const groupSize = useStorage<number>('esport-draw.groupSize', 4) // 0 = unlimited
  const autoAssign = useStorage<boolean>('esport-draw.autoAssign', true)
  const drawMode = useStorage<DrawMode>('esport-draw.drawMode', 'wheel')

  // --- transient state ---
  const spinning = ref(false)
  const lastDrawnId = ref<string | null>(null)
  const result = ref<ResultMessage>({ text: 'กดปุ่มหมุนเพื่อสุ่มทีมแรก', kind: 'idle' })

  // --- id generator (continues past any restored ids) ---
  let idSeq =
    teams.value.reduce((max, t) => {
      const n = Number.parseInt(String(t.id).replace(/\D/g, ''), 10)
      return Number.isFinite(n) ? Math.max(max, n) : max
    }, 0) + 1
  const uid = () => `t${idSeq++}`

  // --- derived state ---
  const unassignedTeams = computed(() =>
    teams.value.filter((t) => assignments.value[t.id] === undefined),
  )
  const schools = computed(() => [...new Set(teams.value.map((t) => t.school))])
  const assignedCount = computed(() => teams.value.length - unassignedTeams.value.length)
  const lastDrawn = computed(() => teams.value.find((t) => t.id === lastDrawnId.value) ?? null)

  const membersOf = (g: number) => teams.value.filter((t) => assignments.value[t.id] === g)
  const isFull = (g: number) => groupSize.value > 0 && membersOf(g).length >= groupSize.value

  /** THE RULE: a group accepts a team only if it isn't full and has no team
   *  from the same school. */
  const isValidTarget = (team: Team, g: number) =>
    !isFull(g) && !membersOf(g).some((t) => t.school === team.school)

  const validGroupsFor = (team: Team) => {
    const out: number[] = []
    for (let g = 0; g < numGroups.value; g++) if (isValidTarget(team, g)) out.push(g)
    return out
  }

  /** The bracket currently being filled = first non-full group (-1 if all full). */
  const currentGroupIndex = computed(() => {
    for (let g = 0; g < numGroups.value; g++) if (!isFull(g)) return g
    return -1
  })

  /**
   * Sequential placement — the "เติมทีละสาย" rule: start at the current bracket
   * and scan FORWARD for the first one this team fits (different school + not full).
   * So a team fills the current bracket, and a same-school clash spills it to the
   * next bracket immediately. Returns -1 if no bracket can take it.
   */
  function nextSequentialGroup(team: Team): number {
    const start = currentGroupIndex.value
    if (start < 0) return -1
    for (let g = start; g < numGroups.value; g++) if (isValidTarget(team, g)) return g
    return -1
  }

  const groups = computed<GroupView[]>(() => {
    const drawn = lastDrawn.value
    const arr: GroupView[] = []
    for (let g = 0; g < numGroups.value; g++) {
      const members = membersOf(g)
      const seen = new Set<string>()
      let hasDupe = false
      for (const m of members) {
        if (seen.has(m.school)) hasDupe = true
        seen.add(m.school)
      }
      arr.push({
        index: g,
        label: groupLabel(g),
        members,
        full: isFull(g),
        hasDupe,
        isValidTarget: drawn ? isValidTarget(drawn, g) : false,
      })
    }
    return arr
  })

  // Replace whole objects/arrays so useStorage reliably persists & reactivity fires.
  const place = (id: string, g: number) => {
    assignments.value = { ...assignments.value, [id]: g }
  }
  const unplace = (id: string) => {
    const next = { ...assignments.value }
    delete next[id]
    assignments.value = next
  }

  // Dropping the group count should release teams assigned to removed groups.
  watch(numGroups, (n) => {
    let changed = false
    const next = { ...assignments.value }
    for (const id of Object.keys(next)) {
      if (next[id]! >= n) {
        delete next[id]
        changed = true
      }
    }
    if (changed) assignments.value = next
  })

  // --- team management ---
  /** Returns an error message, or null on success. */
  function addTeam(name: string, school: string): string | null {
    name = name.trim()
    school = school.trim()
    if (!name) return 'กรุณากรอกชื่อทีม'
    if (!school) return 'กรุณากรอกโรงเรียน'
    if (teams.value.some((t) => t.name.toLowerCase() === name.toLowerCase())) {
      return 'มีทีมชื่อนี้แล้ว'
    }
    teams.value = [...teams.value, { id: uid(), name, school }]
    return null
  }

  /**
   * Bulk-add teams (e.g. from a CSV import). Skips blanks and any name that
   * already exists (case-insensitive), so re-importing is idempotent.
   * Returns how many were added vs skipped.
   */
  function importTeams(entries: { name: string; school: string }[]): {
    added: number
    skipped: number
  } {
    const next = [...teams.value]
    const names = new Set(next.map((t) => t.name.toLowerCase()))
    let added = 0
    let skipped = 0
    for (const e of entries) {
      const name = e.name.trim()
      const school = e.school.trim()
      if (!name || !school || names.has(name.toLowerCase())) {
        skipped++
        continue
      }
      next.push({ id: uid(), name, school })
      names.add(name.toLowerCase())
      added++
    }
    if (added > 0) teams.value = next
    return { added, skipped }
  }

  function removeTeam(id: string) {
    teams.value = teams.value.filter((t) => t.id !== id)
    unplace(id)
    if (lastDrawnId.value === id) lastDrawnId.value = null
  }

  function returnToPool(id: string) {
    unplace(id)
  }

  function returnAll() {
    assignments.value = {}
    lastDrawnId.value = null
    result.value = { text: 'คืนทุกทีมกลับสู่กองรอจับสายแล้ว', kind: 'idle' }
    useTournament().resetTournament()
  }

  function reset() {
    teams.value = []
    assignments.value = {}
    lastDrawnId.value = null
    result.value = { text: 'กดปุ่มหมุนเพื่อสุ่มทีมแรก', kind: 'idle' }
    useTournament().resetTournament()
  }

  // --- drawing & placement ---
  /** Place the drawn team according to the current mode (called by the wheel). */
  function finishDraw(team: Team) {
    if (autoAssign.value) {
      // เติมทีละสาย: ลองสายปัจจุบันก่อน ถ้าโรงเรียนซ้ำให้ข้ามไปสายถัดไปทันที
      const target = currentGroupIndex.value
      const g = nextSequentialGroup(team)

      if (g < 0) {
        lastDrawnId.value = team.id
        result.value = {
          text: `สุ่มได้ ${team.name} (${team.school}) — ไม่มีสายว่างที่คนละโรงเรียน ทีมยังรออยู่ในกอง`,
          kind: 'warn',
        }
        return
      }

      place(team.id, g)
      lastDrawnId.value = null
      result.value =
        g === target
          ? { text: `สุ่มได้ ${team.name} → ใส่สาย ${groupLabel(g)}`, kind: 'ok' }
          : {
              text: `สุ่มได้ ${team.name} → สาย ${groupLabel(target)} มี ${team.school} แล้ว ข้ามไปใส่สาย ${groupLabel(g)}`,
              kind: 'ok',
            }
      return
    }

    // โหมดเลือกเอง
    const valid = validGroupsFor(team)
    if (valid.length === 0) {
      lastDrawnId.value = team.id
      result.value = {
        text: `สุ่มได้ ${team.name} (${team.school}) — ไม่มีสายว่างที่คนละโรงเรียน ทีมยังรออยู่ในกอง`,
        kind: 'warn',
      }
      return
    }
    lastDrawnId.value = team.id
    result.value = {
      text: `สุ่มได้ ${team.name} (${team.school}) — เลือกสายขอบเขียวเพื่อวางทีม`,
      kind: 'pick',
    }
  }

  /**
   * Move any team into a group by id — used by the drag-and-drop / click-to-place
   * manual mode. Enforces THE RULE (different school + not full). Passing g = -1
   * returns the team to the pool. Returns whether it succeeded + why not.
   */
  function moveToGroup(id: string, g: number): { ok: boolean; reason?: string } {
    const team = teams.value.find((t) => t.id === id)
    if (!team) return { ok: false }
    if (g < 0) {
      unplace(id)
      return { ok: true }
    }
    if (assignments.value[id] === g) return { ok: true } // already there — no-op
    if (isValidTarget(team, g)) {
      place(id, g)
      return { ok: true }
    }
    return {
      ok: false,
      reason: isFull(g) ? 'สายนี้เต็มแล้ว' : `มีทีมจาก ${team.school} อยู่ในสายนี้แล้ว`,
    }
  }

  /** Manual placement (clicking a group). Returns whether it succeeded + why not. */
  function clickGroup(g: number): { ok: boolean; reason?: string } {
    const team = lastDrawn.value
    if (!team) return { ok: false }
    if (isValidTarget(team, g)) {
      place(team.id, g)
      lastDrawnId.value = null
      result.value = { text: `จัด ${team.name} เข้าสาย ${groupLabel(g)} เรียบร้อย`, kind: 'ok' }
      return { ok: true }
    }
    const reason = isFull(g) ? 'สายนี้เต็มแล้ว' : `มีทีมจาก ${team.school} อยู่ในสายนี้แล้ว`
    return { ok: false, reason }
  }

  /**
   * Auto-place every remaining team using the same "เติมทีละสาย" rule: fill the
   * current bracket first, spilling same-school clashes to the next bracket.
   * Most-constrained schools go first to minimize teams that can't be placed.
   */
  function autoFill(): { placed: number; failed: number } {
    const pool = [...unassignedTeams.value].sort(
      (a, b) =>
        teams.value.filter((t) => t.school === b.school).length -
        teams.value.filter((t) => t.school === a.school).length,
    )
    let placed = 0
    let failed = 0
    for (const team of pool) {
      const g = nextSequentialGroup(team)
      if (g < 0) {
        failed++
        continue
      }
      place(team.id, g)
      placed++
    }
    lastDrawnId.value = null
    result.value =
      failed > 0
        ? { text: `จัดได้ ${placed} ทีม · เหลือ ${failed} ทีมที่หาสายคนละ ร.ร. ไม่ได้`, kind: 'warn' }
        : { text: `จัดทีมที่เหลือทั้งหมด ${placed} ทีมเรียบร้อย`, kind: 'ok' }
    return { placed, failed }
  }

  // --- export ---
  function exportCsv(): boolean {
    if (teams.value.length === 0) return false
    const rows: (string | number)[][] = [['สาย', 'ลำดับในสาย', 'ชื่อทีม', 'โรงเรียน']]
    for (let g = 0; g < numGroups.value; g++) {
      const members = membersOf(g)
      if (members.length === 0) rows.push([`สาย ${groupLabel(g)}`, '', '', ''])
      else members.forEach((m, i) => rows.push([`สาย ${groupLabel(g)}`, i + 1, m.name, m.school]))
    }
    unassignedTeams.value.forEach((m) => rows.push(['ยังไม่จัดสาย', '', m.name, m.school]))
    downloadFile(csvFileName(), toCsv(rows))
    return true
  }

  // --- sample data ---
  function loadSample() {
    const sample: [string, string][] = [
      ['Dragon Squad', 'ร.ร.สวนกุหลาบ'],
      ['Phoenix Five', 'ร.ร.สวนกุหลาบ'],
      ['Shadow Hunters', 'ร.ร.เตรียมอุดม'],
      ['Cyber Wolves', 'ร.ร.เตรียมอุดม'],
      ['Storm Riders', 'ร.ร.บดินทรเดชา'],
      ['Neon Tigers', 'ร.ร.บดินทรเดชา'],
      ['Galaxy Force', 'ร.ร.อัสสัมชัญ'],
      ['Iron Eagles', 'ร.ร.อัสสัมชัญ'],
      ['Frost Giants', 'ร.ร.มหิดลวิทยานุสรณ์'],
      ['Crimson Blades', 'ร.ร.มหิดลวิทยานุสรณ์'],
      ['Thunder Kings', 'ร.ร.หอวัง'],
      ['Void Walkers', 'ร.ร.หอวัง'],
    ]
    teams.value = sample.map(([name, school]) => ({ id: uid(), name, school }))
    assignments.value = {}
    lastDrawnId.value = null
    result.value = { text: 'โหลดข้อมูลตัวอย่าง 12 ทีม / 6 โรงเรียนแล้ว — กดหมุนได้เลย', kind: 'idle' }
  }

  return {
    // state
    teams,
    numGroups,
    groupSize,
    autoAssign,
    drawMode,
    spinning,
    result,
    // derived
    unassignedTeams,
    schools,
    assignedCount,
    lastDrawn,
    groups,
    currentGroupIndex,
    // rules
    isValidTarget,
    validGroupsFor,
    // actions
    addTeam,
    importTeams,
    removeTeam,
    returnToPool,
    returnAll,
    reset,
    finishDraw,
    clickGroup,
    moveToGroup,
    autoFill,
    exportCsv,
    loadSample,
  }
}

type DrawStore = ReturnType<typeof createDrawStore>
let store: DrawStore | null = null

export function useDraw(): DrawStore {
  if (!store) store = createDrawStore()
  return store
}
