# ออกแบบระบบ Tournament — E-Sport Draw

> เอกสารออกแบบ + แผนการพัฒนา สำหรับต่อยอดจาก "ระบบหมุนวงล้อจับสาย" ให้เป็นระบบจัดการแข่งขันครบวงจร
> เวอร์ชัน: 1.0 · สถานะ: Draft / รออนุมัติ

---

## สารบัญ

1. [ภาพรวมและเป้าหมาย](#1-ภาพรวมและเป้าหมาย)
2. [ขอบเขต (Scope)](#2-ขอบเขต-scope)
3. [สถาปัตยกรรมปัจจุบัน (Recap)](#3-สถาปัตยกรรมปัจจุบัน-recap)
4. [หลักการออกแบบ](#4-หลักการออกแบบ)
5. [State Machine: ขั้นตอนการแข่งขัน](#5-state-machine-ขั้นตอนการแข่งขัน)
6. [Domain Model & Types](#6-domain-model--types)
7. [การเก็บข้อมูล & Migration](#7-การเก็บข้อมูล--migration)
8. [Phase 1 — รอบแบ่งกลุ่ม (Round-Robin)](#8-phase-1--รอบแบ่งกลุ่ม-round-robin)
9. [Phase 2 — รอบน็อคเอาท์ (Knockout Bracket)](#9-phase-2--รอบน็อคเอาท์-knockout-bracket)
10. [Composable API: useTournament](#10-composable-api-usetournament)
11. [Utils ใหม่](#11-utils-ใหม่)
12. [UI / Layout Integration](#12-ui--layout-integration)
13. [CSV Export](#13-csv-export)
14. [รายการไฟล์ที่ต้องแตะ (File-by-File)](#14-รายการไฟล์ที่ต้องแตะ-file-by-file)
15. [Task Breakdown / Checklist](#15-task-breakdown--checklist)
16. [Testing Strategy](#16-testing-strategy)
17. [Risks & Open Decisions](#17-risks--open-decisions)
18. [ประเมินงาน (Effort)](#18-ประเมินงาน-effort)

---

## 1. ภาพรวมและเป้าหมาย

### ปัญหาปัจจุบัน
แอปทำได้แค่ **"จับสาย"** — สุ่มทีมด้วยวงล้อแล้วจัดลงสาย A/B/C/D โดยมีกติกาห้ามโรงเรียนซ้ำในสายเดียวกัน จบที่ "ทีมไหนอยู่สายไหน" คนจัดการแข่งยังต้องไปคิดคู่แข่ง จดผล และหาแชมป์เองทั้งหมด

### เป้าหมาย
ปิด loop ของการจัดทัวร์นาเมนต์ให้ครบ:

```
จับสาย (มีอยู่แล้ว) → แข่งรอบแบ่งกลุ่ม → คัดเข้ารอบน็อคเอาท์ → หาแชมป์
   draw                group stage          knockout            champion
```

### หลักความสำเร็จ (Success Criteria)
- คนจัดสามารถ generate ตารางแข่งรอบแบ่งกลุ่มจากสายที่จับได้ทันที โดยไม่ต้องคิดคู่เอง
- กรอกผลแต่ละแมตช์แล้วระบบคำนวณ **ตารางคะแนน (standings)** + จัดอันดับให้อัตโนมัติ
- คัดทีมเข้ารอบน็อคเอาท์ตามอันดับ แล้ว generate สายแพ้คัดออกพร้อม seeding
- กรอกผลรอบน็อคเอาท์แล้วผู้ชนะเลื่อนสายอัตโนมัติจนได้แชมป์
- คงจุดขายเดิม (กติกาโรงเรียน) ไว้ — ใช้เป็นเงื่อนไข seeding ในรอบน็อคเอาท์
- ข้อมูลทั้งหมด persist ใน localStorage เหมือนเดิม (ไม่มี backend)

---

## 2. ขอบเขต (Scope)

### ✅ In scope
| Phase | สิ่งที่ทำ |
|-------|----------|
| **1** | Round-robin ในแต่ละสาย, กรอกผล, ตารางคะแนน + tiebreakers, UI รอบแบ่งกลุ่ม |
| **2** | คัดทีมเข้ารอบ, seeding (กันโรงเรียน/สายเดียวกันเจอกันรอบแรก), bracket แพ้คัดออก single-elimination, เลื่อนสายอัตโนมัติ, UI bracket tree |
| ทั้งคู่ | State machine สลับ stage, persistence + migration, ขยาย CSV export |

### ❌ Out of scope (เฟสหลัง / ไม่ทำตอนนี้)
- Double-elimination, Swiss system, Best-of-N series (เก็บผลหลายเกมต่อแมตช์)
- รอบชิงที่ 3, การเก็บสถิติผู้เล่นรายคน
- Backend / multi-user / realtime sync
- Drag-and-drop แก้สายด้วยมือใน bracket
- Export เป็น PDF / รูปภาพ bracket

> **เหตุผลการแบ่งเฟส:** Phase 1 (round-robin) ลงแรงน้อย-คุณค่าสูง ใช้ data เดิม 100%. Phase 2 (knockout) เป็น state ใหม่ทั้งก้อน (ผลแมตช์, การเลื่อนสาย, bye) — ทำเมื่อ Phase 1 เสถียรแล้ว แต่ละเฟส ship แยกได้

---

## 3. สถาปัตยกรรมปัจจุบัน (Recap)

| ด้าน | รายละเอียด |
|------|-----------|
| **Framework** | Nuxt 4, SPA (`ssr: false`), Vue 3.5 |
| **UI** | `@nuxt/ui` v4 (UCard, UButton, USelect, UAlert, UBadge, useToast...) ธีม dark, primary = cyan |
| **State** | Singleton store ใน `useDraw()` ([useDraw.ts](../app/composables/useDraw.ts)) — `ref`/`computed` + `useStorage` (VueUse) เก็บลง localStorage prefix `esport-draw.*` |
| **Utils (auto-import)** | `schoolColor`, `groupLabel`, `truncate` ([colors.ts](../app/utils/colors.ts)) · `toCsv`, `csvCell`, `csvFileName`, `downloadFile` ([csv.ts](../app/utils/csv.ts)) |
| **Types** | `Team`, `ResultKind`, `ResultMessage`, `GroupView` ([types/index.ts](../app/types/index.ts)) |
| **Layout** | 3-panel grid ใน [index.vue](../app/pages/index.vue): `TeamSetup` · `SpinWheel` · `BracketGroups` |

**Pattern สำคัญที่จะยึดตาม:**
- รัฐที่ persist = `useStorage`; รัฐชั่วคราว = `ref`. ทุก derived view เป็น `computed` (เช่น `groups`)
- เขียน object/array ทั้งก้อนเวลาอัปเดต (`assignments.value = {...}`) เพื่อให้ `useStorage` + reactivity ทำงานชัวร์ — **ห้าม mutate in place**
- store เป็น lazy singleton: `let store = null; if (!store) store = create()`
- id ทีมเป็น `t1, t2, ...` ผ่าน `uid()`

---

## 4. หลักการออกแบบ

1. **ไม่แตะ `useDraw` มากเกินจำเป็น** — สร้าง store ใหม่ `useTournament()` ที่ "อ่าน" teams/groups จาก `useDraw()` แล้วเป็นเจ้าของ state แมตช์/รอบเอง → แยกความรับผิดชอบ, ลดความเสี่ยง regression กับระบบจับสายเดิม
2. **Derived-first** — matches เก็บแบบ flat ใน localStorage; standings/bracket views คำนวณเป็น `computed` (เลียนแบบ `groups`) ไม่เก็บค่าที่คำนวณซ้ำได้
3. **Stage เป็น single source of truth** ของ "ตอนนี้อยู่ขั้นไหน" — UI ทั้งหมด react ตาม stage; การจับสายถูก "ล็อก" เมื่อ stage ≠ `draw`
4. **Deterministic** — การ generate ตาราง/seeding ต้อง reproducible (ยกเว้นจุดที่ตั้งใจสุ่ม). ใช้ tiebreaker chain ที่ลงเอยเสมอ
5. **ภาษาและธีมเดิม** — UI ภาษาไทย, ใช้ semantic colors เดิม (primary/success/warning/error), ใช้ `schoolColor` เพื่อความต่อเนื่องทางสายตา

---

## 5. State Machine: ขั้นตอนการแข่งขัน

```
        startGroupStage()              startKnockout()            (final played)
 ┌────────┐ ───────────────► ┌────────┐ ──────────────► ┌──────────┐ ─────────► ┌──────────┐
 │ draw   │                  │ group  │                 │ knockout │            │ champion │
 │ จับสาย │ ◄─────────────── │ แบ่งกลุ่ม│ ◄────────────── │ น็อคเอาท์ │            │  แชมป์   │
 └────────┘  backToDraw()    └────────┘  backToGroup()   └──────────┘            └──────────┘
```

| Stage | เข้าได้เมื่อ (guard) | ทำอะไรได้ | ออกไปข้างหน้าเมื่อ |
|-------|--------------------|-----------|-------------------|
| `draw` | เริ่มต้น | เพิ่มทีม / หมุนวงล้อ / จัดสาย (ระบบเดิม) | ทุกสายมี ≥ 2 ทีม → กด "เริ่มรอบแบ่งกลุ่ม" |
| `group` | ผ่าน guard ข้างบน | กรอกผลแมตช์ในแต่ละสาย, ดูตารางคะแนน | ทุกแมตช์รอบกลุ่ม `played` ครบ → กด "เข้าสู่รอบน็อคเอาท์" |
| `knockout` | ผู้ผ่านเข้ารอบ ≥ 2 ทีม | กรอกผลแต่ละแมตช์, ผู้ชนะเลื่อนสาย | แมตช์รอบชิงมีผู้ชนะ |
| `champion` | รอบชิงจบ | ดูสรุป / export / เริ่มใหม่ | — |

**กฎการล็อก/ถอยหลัง:**
- `stage !== 'draw'` → ล็อกปุ่มหมุน, เพิ่ม/ลบทีม, เปลี่ยน numGroups/groupSize ใน `TeamSetup` (แสดง badge "ล็อกระหว่างแข่ง")
- `backToDraw()` / `backToGroup()` ต้อง `confirm()` เพราะจะ **ลบผลแมตช์ของ stage ที่ถอยมา** (และ stage ถัดไปทั้งหมด)
- เก็บ stage ใน `esport-draw.stage`

---

## 6. Domain Model & Types

เพิ่มใน [app/types/index.ts](../app/types/index.ts):

```ts
/** ขั้นของทัวร์นาเมนต์ */
export type Stage = 'draw' | 'group' | 'knockout' | 'champion'

/** ชนิดของแมตช์ */
export type MatchStage = 'group' | 'knockout'

/**
 * แมตช์เดียว (หนึ่งคู่แข่ง) — เก็บแบบ flat ใน localStorage.
 * teamA/teamB เป็น null ได้ในรอบน็อคเอาท์ (รอผู้ชนะรอบก่อน = TBD, หรือ bye)
 */
export interface Match {
  id: string
  stage: MatchStage

  // group stage
  groupIndex?: number        // อยู่สายไหน (เฉพาะ stage='group')
  roundInGroup?: number      // รอบที่เท่าไรของ round-robin (ไว้จัดกลุ่มแสดงผล)

  // knockout
  round?: number             // 0 = รอบแรก, เพิ่มขึ้นเรื่อยๆ จนถึงรอบชิง
  slot?: number              // ตำแหน่งในรอบ (สำหรับวาด bracket จากบนลงล่าง)
  nextMatchId?: string | null  // ผู้ชนะไปแมตช์ไหนต่อ
  nextSlot?: 'A' | 'B'         // ไปเป็นทีม A หรือ B ของแมตช์ถัดไป

  // ทั้งสอง stage
  teamAId: string | null
  teamBId: string | null
  scoreA: number | null
  scoreB: number | null
  played: boolean
  winnerId: string | null      // คำนวณตอนกรอกผล (null = ยังไม่แข่ง/เสมอ)
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
  diff: number          // scoreFor - scoreAgainst
  points: number
  rank: number          // อันดับในสาย (1 = ดีที่สุด)
  qualified: boolean     // อยู่ใน top-N ที่เข้ารอบ
}

/** view รอบแบ่งกลุ่มของหนึ่งสาย (derived) */
export interface GroupStageView {
  index: number
  label: string                 // A, B, C...
  matches: Match[]
  standings: Standing[]
  complete: boolean              // ทุกแมตช์ในสายนี้แข่งจบ
}

/** view หนึ่งรอบของ bracket (derived) */
export interface BracketRound {
  round: number
  label: string                  // "รอบ 16 ทีม", "รอบ 8 ทีม", "รองชนะเลิศ", "ชิงชนะเลิศ"
  matches: Match[]
}

/** ตั้งค่ารูปแบบการแข่ง (persist) */
export interface TournamentConfig {
  pointsWin: number              // default 3
  pointsDraw: number             // default 1
  pointsLoss: number             // default 0
  allowDraw: boolean             // รอบกลุ่มเสมอได้ไหม (default true). รอบน็อคเอาท์ห้ามเสมอเสมอ
  advancePerGroup: number        // ผ่านเข้ารอบกี่ทีมต่อสาย (default 2)
}
```

> **หมายเหตุการออกแบบ Match:** ใช้ type เดียวรวม group/knockout (มี optional fields) เพราะเก็บใน array เดียว persist ง่ายและ filter ด้วย `stage` ได้ตรงๆ. ถ้าต้องการความเข้มงวดของ type สามารถแยกเป็น discriminated union (`GroupMatch | KnockoutMatch`) ภายหลังได้โดยไม่กระทบ storage

---

## 7. การเก็บข้อมูล & Migration

### localStorage keys ใหม่
| Key | ชนิด | ค่าเริ่มต้น |
|-----|------|-----------|
| `esport-draw.stage` | `Stage` | `'draw'` |
| `esport-draw.matches` | `Match[]` | `[]` |
| `esport-draw.config` | `TournamentConfig` | `{3,1,0,true,2}` |
| `esport-draw.schemaVersion` | `number` | `2` |

### Migration
- ผู้ใช้เดิมมีแค่ `teams`/`assignments`/`numGroups`/`groupSize`/`autoAssign` → keys ใหม่ทั้งหมดมี default ผ่าน `useStorage(key, default)` อยู่แล้ว **ไม่ต้องเขียน migration code** สำหรับ v1→v2 (additive ล้วน)
- เพิ่ม `schemaVersion` ไว้เผื่ออนาคต — ถ้า `< 2` ให้ตั้ง stage = `'draw'`, matches = `[]` (กันสถานะค้าง)
- การ `reset()` เดิมต้องขยายให้ล้าง keys ใหม่ด้วย (ดู §14)

### Invariant ที่ต้องรักษา
- ถ้า `stage === 'draw'` → `matches` ต้องว่าง
- ถ้า `stage === 'group'` → มีเฉพาะ match ที่ `stage==='group'`
- ถ้า `stage === 'knockout'/'champion'` → group matches ครบ + มี knockout matches
- ทุกครั้งที่ถอย stage ต้องล้าง matches ของ stage ที่สูงกว่าออกให้หมด

---

## 8. Phase 1 — รอบแบ่งกลุ่ม (Round-Robin)

### 8.1 การ generate ตารางแข่ง (Circle Method)

ในแต่ละสายที่มีสมาชิก `members` → สร้างคู่แข่งทุกคู่ `C(n,2)` จัดเป็นรอบๆ ให้แต่ละทีมแข่งไม่เกิน 1 ครั้งต่อรอบ. ทีมจำนวนคี่ → มี bye 1 ทีมต่อรอบ

`app/utils/roundRobin.ts`:
```ts
/**
 * Circle method — คืน array ของรอบ, แต่ละรอบเป็น array ของคู่ [aId, bId].
 * n คี่จะเติม BYE ภายใน แล้วตัดคู่ที่ติด BYE ออก (ทีมนั้นพักรอบนั้น)
 */
export function roundRobinPairs(ids: string[]): Array<Array<[string, string]>> {
  const arr = [...ids]
  const BYE = '__bye__'
  if (arr.length % 2 === 1) arr.push(BYE)
  const n = arr.length
  const half = n / 2
  const rounds: Array<Array<[string, string]>> = []

  for (let r = 0; r < n - 1; r++) {
    const pairs: Array<[string, string]> = []
    for (let i = 0; i < half; i++) {
      const a = arr[i]!, b = arr[n - 1 - i]!
      if (a !== BYE && b !== BYE) pairs.push([a, b])
    }
    rounds.push(pairs)
    arr.splice(1, 0, arr.pop()!) // ตรึง index 0 แล้วหมุนที่เหลือ
  }
  return rounds
}
```

**`startGroupStage()`** ใน store:
1. guard: ทุกสายต้องมี ≥ 2 ทีม (สายที่มี 0–1 ทีม block พร้อม toast บอกสายไหน)
2. loop ทุกสาย → `roundRobinPairs(memberIds)` → สร้าง `Match` (`stage:'group'`, `groupIndex`, `roundInGroup`, score null, played false) ผ่าน `uid()`
3. set `matches.value = [...allGroupMatches]`, `stage.value = 'group'`

### 8.2 การกรอกผล

- แต่ละ match card มีช่องกรอก `scoreA` / `scoreB` (UInputNumber) + ปุ่ม "บันทึกผล"
- `submitResult(matchId, scoreA, scoreB)`:
  - validate: เป็นจำนวนเต็ม ≥ 0
  - ถ้า `!config.allowDraw && scoreA === scoreB` → reject ("รอบนี้เสมอไม่ได้")
  - set score, `played = true`, `winnerId` = ทีมที่คะแนนสูงกว่า (เท่ากัน = `null`)
  - เขียน match ทั้ง array ใหม่ (immutable update)
- แก้ผลย้อนหลังได้ตราบที่ยังอยู่ stage `group` → standings คำนวณใหม่อัตโนมัติ (computed)

### 8.3 ตารางคะแนน + Tiebreakers

`computeStandings(members, matches, config)` (เป็น computed ต่อสาย):

ลำดับการจัดอันดับ (tiebreaker chain — ลงเอยเสมอ):
1. **points** มากกว่า (win=`pointsWin`, draw=`pointsDraw`, loss=`pointsLoss`)
2. **diff** (ผลต่างสกอร์รวม) มากกว่า
3. **scoreFor** (สกอร์ได้รวม) มากกว่า
4. **head-to-head** — ผลเจอกันตัวต่อตัว *(optional, Phase 1.5 — ระบุไว้ว่าทำทีหลังได้)*
5. **ชื่อทีม** (A→Z) เพื่อ deterministic เด็ดขาด

```ts
export function computeStandings(
  members: Team[], matches: Match[], cfg: TournamentConfig,
): Standing[] {
  const row = new Map<string, Standing>(/* init ทุกทีมเป็น 0 */)
  for (const m of matches) {
    if (!m.played || m.scoreA == null || m.scoreB == null) continue
    // อัปเดต played/won/drawn/lost/scoreFor/scoreAgainst/points ของทั้งสองทีม
  }
  // คำนวณ diff, sort ตาม chain ข้างบน, ใส่ rank (1-indexed)
  // ใส่ qualified = rank <= cfg.advancePerGroup
}
```

### 8.4 UI — `GroupStage.vue`

แสดงทีละสาย (loop `groupStageViews`): การ์ดสายหนึ่งใบมี 2 ส่วน
- **ตารางคะแนน** (บน): แถวเรียงตาม rank — คอลัมน์ `#, ทีม(+dot สี), แข่ง, ชนะ, เสมอ, แพ้, +/-, คะแนน`; แถวที่ `qualified` ไฮไลต์ขอบเขียว (ใช้สไตล์เดียวกับ `.valid` เดิม)
- **รายการแมตช์** (ล่าง): group ตาม `roundInGroup` → แต่ละแมตช์โชว์ `ทีม A [score] vs [score] ทีม B` + ปุ่มบันทึก; แมตช์ที่ played แล้วเป็น read-only + ติ๊กถูก + เน้นผู้ชนะ

ส่วนหัว stage: progress bar "แข่งไปแล้ว X/Y แมตช์" + ปุ่ม **"เข้าสู่รอบน็อคเอาท์"** (disabled จนครบ)

### 8.5 Edge cases (Phase 1)

| กรณี | การจัดการ |
|------|-----------|
| สายมี 1 ทีม | block `startGroupStage`, toast บอกสายนั้น (หรือออปชัน: ทีมนั้นผ่านเข้ารอบอัตโนมัติ — ดู Open Decisions) |
| ทีมในสายเป็นจำนวนคี่ | round-robin มี bye อัตโนมัติ (จัดการใน util แล้ว) |
| แก้ผลหลังกรอกไปแล้ว | อนุญาตใน stage group, standings re-compute ทันที |
| สกอร์เสมอ & `!allowDraw` | reject ตอน submit |
| ทีมคะแนนเท่ากันเป๊ะทุก tiebreaker | ตัดด้วยชื่อทีม (deterministic) + แสดงไอคอนเตือน "อันดับเท่ากัน" ให้คนจัดรู้ว่าควรตัดสินเอง |

---

## 9. Phase 2 — รอบน็อคเอาท์ (Knockout Bracket)

### 9.1 การคัดเข้ารอบ (Qualification)
- รวมผู้ผ่านเข้ารอบ = ทีมที่ `rank <= advancePerGroup` จากทุกสาย
- จำนวนรวม `Q`. ถ้า `Q < 2` → block (ต้องมีอย่างน้อย 2 ทีม)

### 9.2 Seeding
1. จัดลำดับ seed: **แชมป์กลุ่มทุกสายก่อน** (rank 1 ของ A,B,C,...) → ตามด้วยรองแชมป์ทุกสาย (rank 2) → ... (snake ตาม rank). ภายใน rank เดียวกันเรียงตามคุณภาพ (points/diff) เพื่อให้ seed 1 = ทีมฟอร์มดีสุด
2. ขนาด bracket `S = nextPow2(Q)`; ช่องที่เกิน `Q` = **bye** (seed สูงได้ bye)
3. วาง seed ลงตำแหน่ง bracket มาตรฐานด้วย `seedSlots(S)` (1 บนสุด, 2 ล่างสุด, ไขว้กันตามสายแพ้คัดออก)
4. **Constraint pass (best-effort):** สลับคู่รอบแรกเพื่อเลี่ยง (ก) ทีมจากสายเดียวกันเจอกันรอบแรก (ข) ทีมโรงเรียนเดียวกันเจอกันรอบแรก — สลับเฉพาะเมื่อไม่ทำลำดับ seed พังเกินไป; ถ้าเลี่ยงไม่ได้ให้ผ่านพร้อม log เตือน

`app/utils/bracket.ts`:
```ts
/** ลำดับตำแหน่ง seed มาตรฐานของ bracket ขนาด size (1-indexed) */
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

export const nextPow2 = (n: number) => 1 << Math.ceil(Math.log2(Math.max(1, n)))
```

### 9.3 การ generate bracket
1. สร้างแมตช์รอบแรก `S/2` แมตช์ตาม seedSlots (จับ seed-i คู่ seed-(S+1-i)); ช่องที่เป็น bye → อีกฝั่งชนะ bye อัตโนมัติ (`played=true`, winner = ทีมจริง)
2. สร้างแมตช์รอบถัดๆ ไป (`S/4, S/8, ... 1`) ด้วย `teamA/B = null` (TBD) ตั้ง `nextMatchId`/`nextSlot` ของรอบก่อนชี้มา
3. หลังสร้าง: รัน `propagateByes()` — ทีมที่ได้ bye เลื่อนเข้ารอบ 2 ทันที
4. set `matches.value = [...groupMatches, ...knockoutMatches]`, `stage.value = 'knockout'`

### 9.4 การเลื่อนสาย (Advancement)
`submitResult` สำหรับ knockout:
- ห้ามเสมอเสมอ (บังคับมีผู้ชนะ)
- set score/winner/played
- ถ้ามี `nextMatchId` → เขียน `winnerId` ลง `nextSlot` (A/B) ของแมตช์ถัดไป
- ถ้าเป็นรอบชิง (ไม่มี nextMatchId) และ played → `stage = 'champion'`, เก็บ `championId`
- **แก้ผลย้อนหลัง:** ถ้าแก้แมตช์ที่ผู้ชนะเลื่อนไปแล้ว → ต้อง cascade ล้างผลแมตช์ปลายน้ำที่กระทบ (recursive clear downstream) พร้อม `confirm()` เตือน

### 9.5 UI — `KnockoutBracket.vue`
- เรนเดอร์เป็นคอลัมน์ต่อรอบ (`bracketRounds`) ซ้าย→ขวา; แต่ละแมตช์เป็นการ์ดเล็ก 2 แถว (ทีม A / ทีม B) มี dot สีโรงเรียน + ช่องกรอกสกอร์
- ผู้ชนะตัวหนา/ขอบเขียว; ผู้แพ้จาง; TBD = "รอผู้ชนะ"; bye = ป้าย "bye"
- เส้นเชื่อม: เริ่มจาก CSS (กล่อง + เส้นขอบ) ก่อน; ถ้าต้องสวยขึ้นค่อยทำ SVG connectors (เฟสเสริม)
- รอบชิงจบ → แสดงแบนเนอร์ 🏆 "แชมป์: [ทีม] ([โรงเรียน])"
- responsive: bracket กว้าง → ครอบด้วย container scroll-x บนจอเล็ก

### 9.6 Edge cases (Phase 2)
| กรณี | การจัดการ |
|------|-----------|
| Q ไม่ใช่กำลังของ 2 (เช่น 6) | bye เติมให้ครบ 8; seed สูงได้ bye |
| Q < 2 | block เข้ารอบน็อคเอาท์ |
| `advancePerGroup` มากกว่าจำนวนทีมในบางสาย | คัดเท่าที่มี (clamp ต่อสาย) |
| เสมอในรอบน็อคเอาท์ | reject submit, บังคับหาผู้ชนะ |
| แก้ผลที่ cascade ไปไกล | confirm + recursive clear downstream |
| ทุกคู่รอบแรกเลี่ยงโรงเรียนซ้ำไม่ได้ | ผ่านแบบ best-effort + เตือนบน UI |

---

## 10. Composable API: `useTournament`

ไฟล์ใหม่ `app/composables/useTournament.ts` — singleton แบบเดียวกับ `useDraw`, อ่าน source data จาก `useDraw()`

```ts
export function useTournament() {
  // ── persisted ──
  stage: Ref<Stage>
  matches: Ref<Match[]>
  config: Ref<TournamentConfig>

  // ── derived (computed) ──
  groupStageViews: ComputedRef<GroupStageView[]>   // ผูกกับ groups ของ useDraw
  bracketRounds: ComputedRef<BracketRound[]>
  qualifiers: ComputedRef<Standing[]>
  champion: ComputedRef<Team | null>
  groupStageComplete: ComputedRef<boolean>
  groupProgress: ComputedRef<{ played: number; total: number }>
  canStartGroup: ComputedRef<boolean>              // ทุกสาย ≥ 2 ทีม
  locked: ComputedRef<boolean>                     // stage !== 'draw'

  // ── actions ──
  startGroupStage(): { ok: boolean; reason?: string }
  startKnockout(): { ok: boolean; reason?: string }
  submitResult(matchId, scoreA, scoreB): { ok: boolean; reason?: string }
  clearResult(matchId): void                       // เคลียร์ + cascade downstream
  backToDraw(): void                               // confirm; ล้าง matches+stage
  backToGroup(): void                              // confirm; ล้าง knockout matches
  resetTournament(): void                          // ล้าง state ทัวร์นาเมนต์ทั้งหมด
}
```

**การเชื่อมกับ `useDraw`:** `useTournament` import `useDraw()` ภายใน เพื่ออ่าน `teams`, `groups`, `numGroups`. `useDraw.reset()`/`returnAll()` ต้องเรียก `useTournament().resetTournament()` ด้วย (หรือยิง event) เพื่อกัน state ค้าง — จัดการผ่านฟังก์ชัน wrapper ใน store เดียว (ดู §14 ข้อ `useDraw.ts`)

---

## 11. Utils ใหม่

| ไฟล์ | export | หน้าที่ |
|------|--------|--------|
| `app/utils/roundRobin.ts` | `roundRobinPairs(ids)` | สร้างคู่แข่ง round-robin (circle method) |
| `app/utils/bracket.ts` | `seedSlots(size)`, `nextPow2(n)`, `roundLabel(round, totalRounds)` | seeding + ขนาด bracket + ชื่อรอบไทย |
| `app/utils/standings.ts` | `computeStandings(members, matches, cfg)` | คำนวณ + จัดอันดับตาราง |

`roundLabel` → `"ชิงชนะเลิศ"` (รอบสุดท้าย), `"รองชนะเลิศ"` (semifinal), `"รอบ 8 ทีม"`, `"รอบ 16 ทีม"`, …

> ทั้งหมด pure functions → unit test ได้ตรงๆ (ดู §16) และ auto-import ตาม convention เดิม

---

## 12. UI / Layout Integration

### ตัวเลือกที่เลือก: **Stage Stepper** เหนือ content

[index.vue](../app/pages/index.vue) เปลี่ยนจาก grid ตายตัว → render ตาม `stage`:

```vue
<UContainer class="py-6">
  <AppHeader class="mb-5" />
  <StageStepper class="mb-5" />          <!-- ① จับสาย → ② แบ่งกลุ่ม → ③ น็อคเอาท์ → 🏆 -->

  <template v-if="stage === 'draw'">
    <div class="grid ...3 คอลัมน์เดิม...">
      <TeamSetup /><SpinWheel /><BracketGroups />
    </div>
  </template>
  <GroupStage v-else-if="stage === 'group'" />
  <KnockoutBracket v-else />              <!-- knockout + champion -->
</UContainer>
```

**Component ใหม่:**
| Component | บทบาท |
|-----------|-------|
| `StageStepper.vue` | แสดง 4 ขั้น, ไฮไลต์ขั้นปัจจุบัน, ปุ่มเดินหน้า/ถอยหลัง (เรียก action ใน store) |
| `GroupStage.vue` | หน้ารอบแบ่งกลุ่ม (ตารางคะแนน + แมตช์ทุกสาย) |
| `MatchCard.vue` | การ์ดแมตช์ใช้ซ้ำทั้ง group & knockout (props: match, readonly, onSubmit) |
| `KnockoutBracket.vue` | bracket tree + แบนเนอร์แชมป์ |

**ปรับ component เดิม:**
- `TeamSetup.vue` — เมื่อ `locked` ให้ disable การเพิ่มทีม/เปลี่ยน config + แสดงป้าย "🔒 ล็อกระหว่างการแข่งขัน"
- `BracketGroups.vue` — เพิ่มปุ่ม **"เริ่มรอบแบ่งกลุ่ม"** ใน footer (disabled ถ้า `!canStartGroup`) พร้อม tooltip บอกเหตุผล

> ใช้ component/utility ของ `@nuxt/ui` เดิมทั้งหมด (UCard, UButton, UTable หรือ custom table, UInputNumber, UBadge, UProgress) — ไม่เพิ่ม dependency

### ทางเลือกที่ไม่เลือก
- *Tabs* แทน stepper — ไม่สื่อ "ลำดับขั้น" และเปิดข้ามได้ทั้งที่ยังไม่ควร
- *ต่อ panel ลงล่างหน้าเดียว* — รกเมื่อมีหลายสาย/หลายรอบ

---

## 13. CSV Export

ขยาย export เดิม (ปัจจุบันส่งออกเฉพาะการจัดสาย) ให้ครอบคลุม stage:
- **stage group:** export ตารางคะแนนทุกสาย + ผลแมตช์ (`สาย, รอบ, ทีม A, สกอร์, ทีม B, ผู้ชนะ`)
- **stage knockout/champion:** export bracket (`รอบ, ทีม A, สกอร์, ทีม B, ผู้ชนะ`) + บรรทัดแชมป์

ทำเป็นฟังก์ชันแยกใน `useTournament` (`exportGroupCsv`, `exportBracketCsv`) reuse `toCsv`/`downloadFile`/`csvFileName` เดิม. ปุ่ม export ปรากฏตาม stage

---

## 14. รายการไฟล์ที่ต้องแตะ (File-by-File)

### สร้างใหม่
```
app/composables/useTournament.ts      ← store ทัวร์นาเมนต์
app/utils/roundRobin.ts               ← circle method
app/utils/bracket.ts                  ← seeding + ขนาด bracket + ชื่อรอบ
app/utils/standings.ts                ← คำนวณตารางคะแนน
app/components/StageStepper.vue        ← ตัวบอกขั้น + นำทาง
app/components/GroupStage.vue          ← หน้ารอบแบ่งกลุ่ม
app/components/KnockoutBracket.vue     ← หน้ารอบน็อคเอาท์ + แชมป์
app/components/MatchCard.vue           ← การ์ดแมตช์ใช้ซ้ำ
```

### แก้ไข
```
app/types/index.ts        + Stage, MatchStage, Match, Standing, GroupStageView,
                            BracketRound, TournamentConfig
app/pages/index.vue       เปลี่ยน layout → render ตาม stage + StageStepper
app/composables/useDraw.ts ผูก reset()/returnAll() ให้ล้าง tournament state ด้วย;
                            export ตัวช่วยที่ useTournament ต้องใช้ (มีอยู่แล้วเป็นส่วนใหญ่)
app/components/TeamSetup.vue   เพิ่มสถานะ locked + ป้ายล็อก
app/components/BracketGroups.vue ปุ่ม "เริ่มรอบแบ่งกลุ่ม"
docs/tournament-design.md  (เอกสารนี้)
```

> ไฟล์ที่ **ไม่แตะ:** `SpinWheel.vue`, `AppHeader.vue`, `colors.ts`, `csv.ts`, `app.config.ts`, `nuxt.config.ts`, `app.vue` (ตรรกะหมุน/ธีม/utils คงเดิม)

---

## 15. Task Breakdown / Checklist

### Phase 1 — รอบแบ่งกลุ่ม
- [ ] **1.1** เพิ่ม types: `Stage`, `MatchStage`, `Match`, `Standing`, `GroupStageView`, `TournamentConfig`
- [ ] **1.2** `utils/roundRobin.ts` + unit test (n=2,3,4,5,6)
- [ ] **1.3** `utils/standings.ts` + unit test (tiebreakers ครบ)
- [ ] **1.4** `useTournament.ts`: persisted state + `groupStageViews` + `startGroupStage` + `submitResult(group)` + `groupProgress` + `canStartGroup` + `locked`
- [ ] **1.5** ผูก `useDraw.reset/returnAll` → `resetTournament`
- [ ] **1.6** `MatchCard.vue` (กรอก/บันทึก/read-only/เน้นผู้ชนะ)
- [ ] **1.7** `GroupStage.vue` (ตารางคะแนน + แมตช์ต่อสาย + progress)
- [ ] **1.8** `StageStepper.vue` (draw ↔ group)
- [ ] **1.9** แก้ `index.vue` render ตาม stage
- [ ] **1.10** `BracketGroups.vue` ปุ่ม "เริ่มรอบแบ่งกลุ่ม" + `TeamSetup.vue` locked state
- [ ] **1.11** ขยาย CSV export (group)
- [ ] **1.12** ทดสอบมือ: sample data → จับสาย → เริ่มกลุ่ม → กรอกผล → ตารางอัปเดตถูก
- [ ] **1.13** `npm run typecheck` ผ่าน

### Phase 2 — รอบน็อคเอาท์
- [ ] **2.1** `utils/bracket.ts`: `seedSlots`, `nextPow2`, `roundLabel` + unit test
- [ ] **2.2** `useTournament`: `qualifiers`, `startKnockout` (seeding + constraint pass + byes), `bracketRounds`, `champion`
- [ ] **2.3** `submitResult(knockout)` + เลื่อนสาย + `clearResult` cascade
- [ ] **2.4** state machine: `group→knockout→champion`, `backToGroup`
- [ ] **2.5** `KnockoutBracket.vue` + แบนเนอร์แชมป์
- [ ] **2.6** `StageStepper` ครบ 4 ขั้น
- [ ] **2.7** ขยาย CSV export (bracket)
- [ ] **2.8** ทดสอบมือ: Q=4/6/8 (มี bye), แก้ผล cascade, โรงเรียนซ้ำรอบแรก
- [ ] **2.9** `npm run typecheck` ผ่าน

---

## 16. Testing Strategy

> ปัจจุบันโปรเจกต์ยังไม่มี test runner. ตรรกะหลักอยู่ใน **pure utils** → คุ้มที่จะเพิ่ม `vitest` (ตัวเดียว) เทสต์เฉพาะ logic ที่พังเงียบได้

**Unit (vitest) — โฟกัสที่ utils:**
- `roundRobinPairs`: ทุกทีมเจอกันครบทุกคู่พอดี 1 ครั้ง, จำนวนรอบถูก (`n-1` หรือ `n` เมื่อคี่), ไม่มีทีมแข่งซ้ำในรอบเดียว
- `computeStandings`: points คำนวณถูก, tiebreaker เรียงถูกทุกชั้น, `qualified` flag ถูก, deterministic เมื่อเสมอทุกชั้น
- `seedSlots`: ขนาด 2/4/8/16 ตรง pattern มาตรฐาน, seed 1 เจอ seed สุดท้ายในรอบแรก
- `nextPow2`: 5→8, 8→8, 1→1

**Manual / integration:**
- เดินครบ flow ด้วย "ข้อมูลตัวอย่าง" (12 ทีม/6 ร.ร., 4 สาย): draw → group → knockout → champion
- รีเฟรชหน้ากลางทาง → state กลับมาถูก (localStorage)
- เคส bye (Q=6), แก้ผล cascade, ถอย stage แล้วผลถูกล้าง

**Type safety:** `npm run typecheck` (vue-tsc) ต้องผ่านทุก phase — ถือเป็น gate

---

## 17. Risks & Open Decisions

### ความเสี่ยง
| ความเสี่ยง | ผลกระทบ | การลด |
|-----------|---------|------|
| State machine ค้าง/ไม่ sync ระหว่าง draw ↔ tournament | สูง | invariant ชัด (§7) + ผูก reset ให้ล้างพร้อมกัน + ทดสอบถอย stage |
| แก้ผล knockout แล้ว cascade พลาด | กลาง | recursive clear downstream + confirm + เทสต์เคสแก้ผลรอบลึก |
| Seeding เลี่ยงโรงเรียนซ้ำไม่ได้ทุกกรณี | ต่ำ | best-effort + เตือนชัดบน UI (ไม่ block) |
| bracket กว้างบนมือถือ | ต่ำ | scroll-x container; เริ่มด้วย CSS ก่อน SVG |

### Open Decisions (มี default แนะนำ — ไม่ block การเริ่มงาน)
1. **สายที่มี 1 ทีม** → *แนะนำ:* block ไม่ให้เริ่มรอบกลุ่ม (ชัดเจน). ทางเลือก: ให้ผ่านเข้ารอบ knockout อัตโนมัติ
2. **ผ่านเข้ารอบกี่ทีม/สาย** → *แนะนำ default 2*, ปรับได้ใน config
3. **เสมอในรอบกลุ่ม** → *แนะนำ:* อนุญาต (`allowDraw=true`, win/draw/loss = 3/1/0). รอบน็อคเอาท์ห้ามเสมอเสมอ
4. **Best-of-N ต่อแมตช์** → *ออกนอก scope* รอบนี้ (เก็บสกอร์เกมเดียว). เผื่อโครงสร้าง Match ให้ขยายภายหลัง
5. **Head-to-head tiebreaker** → *เลื่อนเป็น Phase 1.5* (chain หลักลงเอยด้วยชื่อทีมแล้ว deterministic อยู่)
6. **เพิ่ม vitest** → *แนะนำเพิ่ม* (เบา, คุ้มกับ logic เสี่ยง) — ถ้าไม่อยากเพิ่ม dependency ใช้ manual test ได้

---

## 18. ประเมินงาน (Effort)

| Phase | งานหลัก | ประเมิน |
|-------|--------|---------|
| **Phase 1** | round-robin + standings + UI รอบกลุ่ม + stepper + integration | ~60% ของงานทั้งหมด |
| **Phase 2** | seeding + bracket gen + advancement + UI bracket | ~40% |
| รวม | 8 ไฟล์ใหม่ + แก้ 6 ไฟล์ | ship ได้ทีละ phase |

**ลำดับแนะนำ:** ทำ Phase 1 ให้ครบ ship/ทดสอบก่อน แล้วค่อย Phase 2 — ระบบใช้งานได้จริงตั้งแต่จบ Phase 1 (รอบแบ่งกลุ่ม + ตารางคะแนนก็เป็น tournament ที่สมบูรณ์ในตัว)

---

*จบเอกสาร — พร้อมเริ่ม implement เมื่ออนุมัติ. แนะนำเริ่มที่ task 1.1–1.4 (types + utils + store แกน) เพราะ UI ทั้งหมดต่อยอดจากตรงนี้*
