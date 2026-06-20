import type { Team, Match, Standing, TournamentConfig } from '~/types'

/**
 * คำนวณตารางคะแนนจากแมตช์รอบแบ่งกลุ่มของสายหนึ่ง
 * Tiebreaker chain: points → diff → scoreFor → ชื่อทีม (deterministic)
 */
export function computeStandings(
  members: Team[],
  matches: Match[],
  cfg: TournamentConfig,
): Standing[] {
  const rows = new Map<string, Standing>(
    members.map((t) => [
      t.id,
      {
        team: t,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        scoreFor: 0,
        scoreAgainst: 0,
        diff: 0,
        points: 0,
        rank: 0,
        qualified: false,
      },
    ]),
  )

  for (const m of matches) {
    if (!m.played || m.scoreA == null || m.scoreB == null) continue
    const a = rows.get(m.teamAId ?? '')
    const b = rows.get(m.teamBId ?? '')
    if (!a || !b) continue

    a.played++
    b.played++
    a.scoreFor += m.scoreA
    a.scoreAgainst += m.scoreB
    b.scoreFor += m.scoreB
    b.scoreAgainst += m.scoreA

    if (m.scoreA > m.scoreB) {
      a.won++
      a.points += cfg.pointsWin
      b.lost++
      b.points += cfg.pointsLoss
    } else if (m.scoreA < m.scoreB) {
      b.won++
      b.points += cfg.pointsWin
      a.lost++
      a.points += cfg.pointsLoss
    } else {
      a.drawn++
      a.points += cfg.pointsDraw
      b.drawn++
      b.points += cfg.pointsDraw
    }
  }

  const sorted = [...rows.values()]
    .map((r) => ({ ...r, diff: r.scoreFor - r.scoreAgainst }))
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points
      if (b.diff !== a.diff) return b.diff - a.diff
      if (b.scoreFor !== a.scoreFor) return b.scoreFor - a.scoreFor
      return a.team.name.localeCompare(b.team.name)
    })

  return sorted.map((r, i) => ({
    ...r,
    rank: i + 1,
    qualified: i + 1 <= cfg.advancePerGroup,
  }))
}
