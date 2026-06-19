/**
 * Deterministic color per school name — same school always gets the same hue.
 * Used for wheel segments and team dots so duplicate schools are obvious.
 */
export function schoolColor(school: string): string {
  if (!school) return 'hsl(220 10% 55%)'
  let h = 0
  for (let i = 0; i < school.length; i++) h = (h * 31 + school.charCodeAt(i)) % 360
  return `hsl(${h} 68% 56%)`
}

/** Group index → label: 0 → A, 1 → B, ... */
export function groupLabel(index: number): string {
  return String.fromCharCode(65 + index)
}

/** Shorten a string for tight UI (wheel labels). */
export function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s
}
