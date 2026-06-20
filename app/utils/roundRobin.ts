/**
 * Circle method round-robin scheduler.
 * คืน array ของรอบ แต่ละรอบเป็น array ของคู่ [aId, bId].
 * จำนวนทีมคี่ → เติม BYE แล้วตัดคู่ที่ติด BYE ออก (ทีมนั้นพักรอบนั้น)
 */
export function roundRobinPairs(ids: string[]): Array<Array<[string, string]>> {
  const BYE = '__bye__'
  const arr = [...ids]
  if (arr.length % 2 === 1) arr.push(BYE)
  const n = arr.length
  const half = n / 2
  const rounds: Array<Array<[string, string]>> = []

  for (let r = 0; r < n - 1; r++) {
    const pairs: Array<[string, string]> = []
    for (let i = 0; i < half; i++) {
      const a = arr[i]!
      const b = arr[n - 1 - i]!
      if (a !== BYE && b !== BYE) pairs.push([a, b])
    }
    rounds.push(pairs)
    // ตรึง index 0 แล้วหมุนที่เหลือทวนเข็มนาฬิกา
    arr.splice(1, 0, arr.pop()!)
  }

  return rounds
}
