/** ค่ากำลัง 2 ที่น้อยที่สุดที่ ≥ n */
export const nextPow2 = (n: number): number => 1 << Math.ceil(Math.log2(Math.max(2, n)))

/**
 * ลำดับตำแหน่ง seed มาตรฐานของ bracket ขนาด size (1-indexed)
 * Seed 1 เจอ seed สุดท้ายในรอบแรก — ไขว้กันตามสายแพ้คัดออกมาตรฐาน
 */
export function seedSlots(size: number): number[] {
  let seeds = [1, 2]
  while (seeds.length < size) {
    const sum = seeds.length * 2 + 1
    const next: number[] = []
    for (const s of seeds) next.push(s, sum - s)
    seeds = next
  }
  return seeds
}

/** ชื่อรอบแข่งเป็นภาษาไทย */
export function roundLabel(round: number, totalRounds: number): string {
  const fromFinal = totalRounds - 1 - round
  if (fromFinal === 0) return 'ชิงชนะเลิศ'
  if (fromFinal === 1) return 'รองชนะเลิศ'
  const teamsThisRound = Math.pow(2, fromFinal + 1)
  return `รอบ ${teamsThisRound} ทีม`
}
