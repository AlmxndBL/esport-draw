/** A competing team and the school it belongs to. */
export interface Team {
  id: string
  name: string
  school: string
}

/** Kind of feedback shown after a draw / action — drives the result banner color. */
export type ResultKind = 'idle' | 'ok' | 'warn' | 'pick'

export interface ResultMessage {
  text: string
  kind: ResultKind
}

/** A derived, render-ready view of one competition group (สาย). */
export interface GroupView {
  index: number
  /** Display label: A, B, C... */
  label: string
  members: Team[]
  /** Group has reached its size cap. */
  full: boolean
  /** Two members share a school — a rule violation (guards manual edits). */
  hasDupe: boolean
  /** Valid drop target for the currently drawn team (different school + not full). */
  isValidTarget: boolean
}

// ─── Tournament types ─────────────────────────────────────────────────────────

/** ขั้นของทัวร์นาเมนต์ */
export type Stage = 'draw' | 'group' | 'knockout' | 'champion'

/** ชนิดของแมตช์ */
export type MatchStage = 'group' | 'knockout'

/**
 * แมตช์เดียว (หนึ่งคู่แข่ง) — เก็บแบบ flat ใน localStorage.
 * teamAId/teamBId เป็น null ได้ในรอบน็อคเอาท์ (รอผู้ชนะรอบก่อน = TBD, หรือ bye)
 */
export interface Match {
  id: string
  stage: MatchStage

  // group stage
  groupIndex?: number
  roundInGroup?: number

  // knockout
  round?: number
  slot?: number
  nextMatchId?: string | null
  nextSlot?: 'A' | 'B'

  // ทั้งสอง stage
  teamAId: string | null
  teamBId: string | null
  scoreA: number | null
  scoreB: number | null
  played: boolean
  winnerId: string | null
}

/** หนึ่งแถวในตารางคะแนน (derived ไม่ persist) */
export interface Standing {
  team: Team
  played: number
  won: number
  drawn: number
  lost: number
  scoreFor: number
  scoreAgainst: number
  diff: number
  points: number
  rank: number
  qualified: boolean
}

/** view รอบแบ่งกลุ่มของหนึ่งสาย (derived) */
export interface GroupStageView {
  index: number
  label: string
  matches: Match[]
  standings: Standing[]
  complete: boolean
}

/** view หนึ่งรอบของ bracket (derived) */
export interface BracketRound {
  round: number
  label: string
  matches: Match[]
}

/** ตั้งค่ารูปแบบการแข่ง (persist) */
export interface TournamentConfig {
  pointsWin: number
  pointsDraw: number
  pointsLoss: number
  allowDraw: boolean
  advancePerGroup: number
}
