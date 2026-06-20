import { useStorage } from '@vueuse/core'
import type {
  Stage,
  Match,
  Standing,
  GroupStageView,
  BracketRound,
  TournamentConfig,
  Team,
} from '~/types'

const DEFAULT_CONFIG: TournamentConfig = {
  pointsWin: 3,
  pointsDraw: 1,
  pointsLoss: 0,
  allowDraw: true,
  advancePerGroup: 2,
}

let mId = 0
const mid = () => `m${++mId}`

function createTournamentStore() {
  const draw = useDraw()

  // ── persisted ──────────────────────────────────────────────────────────────
  const stage = useStorage<Stage>('esport-draw.stage', 'draw')
  const matches = useStorage<Match[]>('esport-draw.matches', [])
  const config = useStorage<TournamentConfig>('esport-draw.config', { ...DEFAULT_CONFIG })
  const schemaVersion = useStorage<number>('esport-draw.schemaVersion', 2)
  const championId = useStorage<string | null>('esport-draw.championId', null)

  // migration guard
  if (schemaVersion.value < 2) {
    stage.value = 'draw'
    matches.value = []
    championId.value = null
    schemaVersion.value = 2
  }

  // ── derived ────────────────────────────────────────────────────────────────
  const locked = computed(() => stage.value !== 'draw')

  const canStartGroup = computed(() => {
    const groups = draw.groups.value
    return groups.length >= 2 && groups.every((g) => g.members.length >= 2)
  })

  const groupMatches = computed(() => matches.value.filter((m) => m.stage === 'group'))
  const knockoutMatches = computed(() => matches.value.filter((m) => m.stage === 'knockout'))

  const groupStageViews = computed<GroupStageView[]>(() => {
    return draw.groups.value.map((g) => {
      const gMatches = groupMatches.value.filter((m) => m.groupIndex === g.index)
      const standings = computeStandings(g.members, gMatches, config.value)
      return {
        index: g.index,
        label: g.label,
        matches: gMatches,
        standings,
        complete: gMatches.length > 0 && gMatches.every((m) => m.played),
      }
    })
  })

  const groupStageComplete = computed(() =>
    groupStageViews.value.length > 0 && groupStageViews.value.every((v) => v.complete),
  )

  const groupProgress = computed(() => {
    const all = groupMatches.value
    return { played: all.filter((m) => m.played).length, total: all.length }
  })

  const qualifiers = computed<Standing[]>(() => {
    const out: Standing[] = []
    for (const view of groupStageViews.value) {
      out.push(...view.standings.filter((s) => s.qualified))
    }
    return out
  })

  const canStartKnockout = computed(() => groupStageComplete.value && qualifiers.value.length >= 2)

  const bracketRounds = computed<BracketRound[]>(() => {
    const kMatches = knockoutMatches.value
    if (kMatches.length === 0) return []
    const maxRound = Math.max(...kMatches.map((m) => m.round ?? 0))
    const totalRounds = maxRound + 1
    const rounds: BracketRound[] = []
    for (let r = 0; r <= maxRound; r++) {
      rounds.push({
        round: r,
        label: roundLabel(r, totalRounds),
        matches: kMatches.filter((m) => m.round === r).sort((a, b) => (a.slot ?? 0) - (b.slot ?? 0)),
      })
    }
    return rounds
  })

  const champion = computed<Team | null>(() => {
    if (!championId.value) return null
    return draw.teams.value.find((t) => t.id === championId.value) ?? null
  })

  // ── helpers ────────────────────────────────────────────────────────────────
  function writeMatch(updated: Match) {
    matches.value = matches.value.map((m) => (m.id === updated.id ? updated : m))
  }

  /** ล้างผลแมตช์ที่รับรู้ winnerId จากแมตช์ที่ระบุ (cascade downstream) */
  function clearDownstream(matchId: string) {
    const m = matches.value.find((x) => x.id === matchId)
    if (!m || !m.nextMatchId) return
    const next = matches.value.find((x) => x.id === m.nextMatchId)
    if (!next) return
    const cleared: Match = {
      ...next,
      ...(m.nextSlot === 'A' ? { teamAId: null } : { teamBId: null }),
      scoreA: null,
      scoreB: null,
      played: false,
      winnerId: null,
    }
    writeMatch(cleared)
    if (next.played) clearDownstream(next.id)
  }

  // ── actions ────────────────────────────────────────────────────────────────
  function startGroupStage(): { ok: boolean; reason?: string } {
    const bad = draw.groups.value.filter((g) => g.members.length < 2).map((g) => `สาย ${g.label}`)
    if (bad.length > 0) {
      return { ok: false, reason: `${bad.join(', ')} มีทีมน้อยกว่า 2 ทีม` }
    }

    const newMatches: Match[] = []
    for (const g of draw.groups.value) {
      const ids = g.members.map((t) => t.id)
      const rounds = roundRobinPairs(ids)
      rounds.forEach((pairs, roundIdx) => {
        pairs.forEach(([aId, bId]) => {
          newMatches.push({
            id: mid(),
            stage: 'group',
            groupIndex: g.index,
            roundInGroup: roundIdx,
            teamAId: aId,
            teamBId: bId,
            scoreA: null,
            scoreB: null,
            played: false,
            winnerId: null,
          })
        })
      })
    }

    matches.value = newMatches
    stage.value = 'group'
    return { ok: true }
  }

  function startKnockout(): { ok: boolean; reason?: string } {
    if (!groupStageComplete.value) {
      return { ok: false, reason: 'ผลรอบแบ่งกลุ่มยังไม่ครบ' }
    }
    const seeds = buildSeeding()
    if (seeds.length < 2) {
      return { ok: false, reason: 'ทีมผ่านเข้ารอบน้อยกว่า 2 ทีม' }
    }

    const bracketSize = nextPow2(seeds.length)
    const slots = seedSlots(bracketSize)

    // วาง seed ลงตำแหน่งตาม slots — ช่องที่ไม่มีทีม = BYE (null)
    const slotToTeam = new Map<number, Team | null>()
    for (let i = 0; i < bracketSize; i++) {
      const seed = slots[i]!
      slotToTeam.set(i, seed <= seeds.length ? (seeds[seed - 1] ?? null) : null)
    }

    // สร้างแมตช์ทุกรอบ (เก็บ id ก่อนเพื่อ link nextMatchId)
    const totalRounds = Math.log2(bracketSize)
    const roundMatchIds: string[][] = []
    for (let r = 0; r < totalRounds; r++) {
      const count = bracketSize / Math.pow(2, r + 1)
      roundMatchIds.push(Array.from({ length: count }, () => mid()))
    }

    const newMatches: Match[] = []

    // รอบแรก — ใส่ทีมจริงหรือ BYE
    for (let slot = 0; slot < bracketSize / 2; slot++) {
      const tA = slotToTeam.get(slot * 2) ?? null
      const tB = slotToTeam.get(slot * 2 + 1) ?? null
      const isBye = tA === null || tB === null
      const winner = tA === null ? tB : tB === null ? tA : null
      newMatches.push({
        id: roundMatchIds[0]![slot]!,
        stage: 'knockout',
        round: 0,
        slot,
        nextMatchId: totalRounds > 1 ? (roundMatchIds[1]![Math.floor(slot / 2)] ?? null) : null,
        nextSlot: slot % 2 === 0 ? 'A' : 'B',
        teamAId: tA?.id ?? null,
        teamBId: tB?.id ?? null,
        scoreA: isBye ? null : null,
        scoreB: isBye ? null : null,
        played: isBye,
        winnerId: winner?.id ?? null,
      })
    }

    // รอบถัดๆ ไป — TBD
    for (let r = 1; r < totalRounds; r++) {
      const count = bracketSize / Math.pow(2, r + 1)
      for (let slot = 0; slot < count; slot++) {
        newMatches.push({
          id: roundMatchIds[r]![slot]!,
          stage: 'knockout',
          round: r,
          slot,
          nextMatchId: r < totalRounds - 1 ? (roundMatchIds[r + 1]![Math.floor(slot / 2)] ?? null) : null,
          nextSlot: slot % 2 === 0 ? 'A' : 'B',
          teamAId: null,
          teamBId: null,
          scoreA: null,
          scoreB: null,
          played: false,
          winnerId: null,
        })
      }
    }

    // propagate byes — เลื่อนผู้ชนะ bye เข้ารอบถัดไปทันที
    for (const m of newMatches.filter((x) => x.round === 0 && x.played && x.winnerId)) {
      propagateWinner(m, newMatches)
    }

    matches.value = [...groupMatches.value, ...newMatches]
    stage.value = 'knockout'
    return { ok: true }
  }

  function propagateWinner(m: Match, pool: Match[]) {
    if (!m.nextMatchId || !m.winnerId) return
    const next = pool.find((x) => x.id === m.nextMatchId)
    if (!next) return
    if (m.nextSlot === 'A') next.teamAId = m.winnerId
    else next.teamBId = m.winnerId
    // ถ้าทั้งสองช่องมี bye → เลื่อนต่อ (ไม่น่าเกิด แต่ guard ไว้)
    if (next.teamAId !== null && next.teamBId === null && next.round === 0) return
    if (next.teamBId !== null && next.teamAId === null && next.round === 0) return
  }

  /** สร้าง seeding list จากผู้ผ่านเข้ารอบ — แชมป์กลุ่มก่อน ตามด้วยรองแชมป์ */
  function buildSeeding(): Team[] {
    const views = groupStageViews.value
    const byRank: Standing[][] = []
    const maxRank = config.value.advancePerGroup
    for (let rank = 1; rank <= maxRank; rank++) {
      const row = views
        .map((v) => v.standings.find((s) => s.rank === rank))
        .filter((s): s is Standing => s != null)
        .sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points
          if (b.diff !== a.diff) return b.diff - a.diff
          return b.scoreFor - a.scoreFor
        })
      byRank.push(row)
    }
    return byRank.flat().map((s) => s.team)
  }

  function submitResult(
    matchId: string,
    scoreA: number,
    scoreB: number,
  ): { ok: boolean; reason?: string } {
    const m = matches.value.find((x) => x.id === matchId)
    if (!m) return { ok: false, reason: 'ไม่พบแมตช์' }
    if (scoreA < 0 || scoreB < 0 || !Number.isInteger(scoreA) || !Number.isInteger(scoreB)) {
      return { ok: false, reason: 'คะแนนต้องเป็นจำนวนเต็มที่ไม่ติดลบ' }
    }
    if (m.stage === 'knockout' && scoreA === scoreB) {
      return { ok: false, reason: 'รอบน็อคเอาท์เสมอไม่ได้ — ต้องมีผู้ชนะ' }
    }
    if (!config.value.allowDraw && scoreA === scoreB) {
      return { ok: false, reason: 'กำหนดให้ไม่มีเสมอ' }
    }

    // ถ้าแมตช์นี้เคย played และมี downstream → clear ก่อน
    if (m.played && m.winnerId && m.nextMatchId) {
      clearDownstream(matchId)
    }

    const winnerId =
      scoreA > scoreB ? m.teamAId : scoreB > scoreA ? m.teamBId : null

    const updated: Match = { ...m, scoreA, scoreB, played: true, winnerId }
    writeMatch(updated)

    // knockout: เลื่อนผู้ชนะ
    if (m.stage === 'knockout' && winnerId && m.nextMatchId) {
      const next = matches.value.find((x) => x.id === m.nextMatchId)
      if (next) {
        writeMatch({
          ...next,
          ...(m.nextSlot === 'A' ? { teamAId: winnerId } : { teamBId: winnerId }),
        })
      }
    }

    // knockout final → champion
    if (m.stage === 'knockout' && !m.nextMatchId && winnerId) {
      championId.value = winnerId
      stage.value = 'champion'
    }

    return { ok: true }
  }

  function clearResult(matchId: string) {
    const m = matches.value.find((x) => x.id === matchId)
    if (!m) return
    if (m.played && m.winnerId && m.nextMatchId) clearDownstream(matchId)
    writeMatch({ ...m, scoreA: null, scoreB: null, played: false, winnerId: null })
    if (stage.value === 'champion') {
      stage.value = 'knockout'
      championId.value = null
    }
  }

  function backToDraw() {
    matches.value = []
    stage.value = 'draw'
    championId.value = null
  }

  function backToGroup() {
    matches.value = groupMatches.value
    stage.value = 'group'
    championId.value = null
  }

  function resetTournament() {
    matches.value = []
    stage.value = 'draw'
    championId.value = null
  }

  // ── CSV export ─────────────────────────────────────────────────────────────
  function exportGroupCsv(): boolean {
    if (groupMatches.value.length === 0) return false
    const allTeams = draw.teams.value
    const teamName = (id: string | null) =>
      id ? (allTeams.find((t) => t.id === id)?.name ?? id) : '?'

    const rows: (string | number)[][] = [['สาย', 'รอบ', 'ทีม A', 'สกอร์ A', 'ทีม B', 'สกอร์ B', 'ผู้ชนะ']]
    for (const view of groupStageViews.value) {
      for (const m of view.matches) {
        rows.push([
          `สาย ${view.label}`,
          `รอบ ${(m.roundInGroup ?? 0) + 1}`,
          teamName(m.teamAId),
          m.scoreA ?? '',
          teamName(m.teamBId),
          m.scoreB ?? '',
          m.winnerId ? teamName(m.winnerId) : m.played ? 'เสมอ' : '',
        ])
      }
    }
    downloadFile(csvFileName(), toCsv(rows))
    return true
  }

  function exportBracketCsv(): boolean {
    if (knockoutMatches.value.length === 0) return false
    const allTeams = draw.teams.value
    const teamName = (id: string | null) =>
      id ? (allTeams.find((t) => t.id === id)?.name ?? 'TBD') : 'TBD'

    const rows: (string | number)[][] = [['รอบ', 'ทีม A', 'สกอร์ A', 'ทีม B', 'สกอร์ B', 'ผู้ชนะ']]
    for (const round of bracketRounds.value) {
      for (const m of round.matches) {
        rows.push([
          round.label,
          teamName(m.teamAId),
          m.scoreA ?? '',
          teamName(m.teamBId),
          m.scoreB ?? '',
          m.winnerId ? teamName(m.winnerId) : '',
        ])
      }
    }
    if (champion.value) rows.push(['🏆 แชมป์', champion.value.name, '', '', '', ''])
    downloadFile(csvFileName(), toCsv(rows))
    return true
  }

  return {
    // state
    stage,
    matches,
    config,
    championId,
    // derived
    locked,
    canStartGroup,
    canStartKnockout,
    groupStageViews,
    groupStageComplete,
    groupProgress,
    qualifiers,
    bracketRounds,
    champion,
    // actions
    startGroupStage,
    startKnockout,
    submitResult,
    clearResult,
    backToDraw,
    backToGroup,
    resetTournament,
    exportGroupCsv,
    exportBracketCsv,
  }
}

type TournamentStore = ReturnType<typeof createTournamentStore>
let tStore: TournamentStore | null = null

export function useTournament(): TournamentStore {
  if (!tStore) tStore = createTournamentStore()
  return tStore
}
