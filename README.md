# ระบบหมุนวงล้อจับสาย E-Sport (Nuxt + Nuxt UI 4)

เว็บแอปสุ่มทีมด้วยวงล้อ แล้วจัดทีมลง "สายการแข่งขัน" โดยมีกติกาบังคับว่า
**ทีมในสายเดียวกันต้องมาจากคนละโรงเรียน** — ถ้าโรงเรียนซ้ำจะวางในสายเดียวกันไม่ได้

รื้อจากเวอร์ชัน HTML ไฟล์เดียว มาเป็น Nuxt เพื่อให้ดูแล/ต่อยอดง่าย

## Tech stack

| ส่วน | ใช้ |
|------|-----|
| Framework | Nuxt 4 (SPA, `ssr: false`) |
| UI | Nuxt UI 4 (Tailwind CSS v4) |
| State / utils | VueUse (`useStorage` เก็บลง localStorage) |
| ภาษา | TypeScript |

## โครงสร้างโปรเจกต์

```
app/
├─ app.vue                  # UApp wrapper + พื้นหลัง
├─ app.config.ts            # ธีมสีของ Nuxt UI
├─ assets/css/main.css      # import tailwind + nuxt ui + พื้นหลัง
├─ types/index.ts           # Team, GroupView, ResultMessage
├─ utils/
│  ├─ colors.ts             # schoolColor / groupLabel / truncate (pure)
│  └─ csv.ts                # สร้าง + ดาวน์โหลด CSV (pure + client download)
├─ composables/
│  └─ useDraw.ts            # ★ สมองของระบบ: state + กติกาทั้งหมด (single source of truth)
├─ components/
│  ├─ AppHeader.vue         # หัวเรื่อง + ป้ายกติกา
│  ├─ TeamSetup.vue         # ① จัดการทีม + ตั้งค่า
│  ├─ SpinWheel.vue         # ② วงล้อ canvas + ปุ่มหมุน
│  └─ BracketGroups.vue     # ③ สายการแข่งขัน + export
└─ pages/index.vue          # ประกอบ 3 panel เข้าด้วยกัน
```

### หลักการแยกชั้น (ทำไมดูแลง่าย)

- **กติกาอยู่ที่เดียว** — ตรรกะ "คนละโรงเรียน" อยู่ใน `useDraw.ts` (`isValidTarget`, `validGroupsFor`)
  คอมโพเนนต์แค่เรียกใช้ ไม่มีการ copy กติกาไปไว้หลายที่
- **utils บริสุทธิ์** — `colors.ts` / `csv.ts` ไม่มี state เขียน unit test ได้ตรงๆ
- **UI เป็น component ย่อย** — แต่ละ panel แก้ได้อิสระ
- **state เก็บอัตโนมัติ** — `useStorage` sync ลง localStorage ปิด/เปิดเบราว์เซอร์แล้วข้อมูลยังอยู่

## กติกา (หัวใจของระบบ)

```ts
// app/composables/useDraw.ts
const isValidTarget = (team, g) =>
  !isFull(g) && !membersOf(g).some((t) => t.school === team.school)
```

- **โหมดอัตโนมัติ (เติมทีละสาย)** — หมุนได้ทีมไหน ระบบลองใส่ "สายปัจจุบัน" ก่อน
  ถ้าโรงเรียนซ้ำในสายนั้นจะข้ามไปใส่สายถัดไปทันที (สแกนไปข้างหน้าจนเจอสายที่ลงได้)
  เติมสายปัจจุบันจนเต็มแล้วค่อยขยับไปสายต่อไป — การ์ดสายที่กำลังเติมมีขอบฟ้า + ป้าย "● กำลังเติม"
- **โหมดเลือกเอง** — สายที่วางได้ขอบเขียวเรืองแสง, สายที่ห้ามจะจาง คลิกแล้วสั่น + แจ้งเหตุผล
- **กรณีตัน** — ถ้าทุกสายมีโรงเรียนนั้นแล้ว/เต็ม → เตือน ทีมค้างในกอง ไม่ถูกยัดผิดกติกา
- **จัดที่เหลือทั้งหมด** — เติมทีละสายแบบเดียวกัน (สาย A ให้เต็มก่อน) จัดทีมที่โรงเรียนซ้ำเยอะก่อนเพื่อลดโอกาสตัน

## เริ่มใช้งาน

```bash
npm install
npm run dev        # http://localhost:3000
```

build เป็น static:

```bash
npm run generate   # ได้ไฟล์ใน .output/public
npm run preview
```

ตรวจ type:

```bash
npm run typecheck
```
