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
