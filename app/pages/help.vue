<script setup lang="ts">
useHead({ title: 'วิธีใช้งาน · ระบบจับสาย E-Sport' })

const steps = [
  { icon: 'i-lucide-users', label: 'เพิ่มทีม', hint: 'พิมพ์เอง หรือนำเข้า CSV' },
  { icon: 'i-lucide-shuffle', label: 'จับสาย', hint: 'สุ่มวงล้อ หรือลากวางเอง' },
  { icon: 'i-lucide-table-2', label: 'แข่งรอบกลุ่ม', hint: 'กรอกผล ดูตารางคะแนน' },
  { icon: 'i-lucide-trophy', label: 'หาแชมป์', hint: 'รอบน็อคเอาท์แพ้คัดออก' },
]

const features = [
  {
    icon: 'i-lucide-list-plus',
    color: 'text-primary',
    title: 'จัดการทีม & นำเข้า CSV',
    points: [
      'เพิ่มทีมทีละทีม (ชื่อทีม + โรงเรียน) มี autocomplete โรงเรียนที่เคยกรอก',
      'นำเข้าหลายทีมพร้อมกันจากไฟล์ .csv — ตรวจหัวคอลัมน์ไทย/อังกฤษอัตโนมัติ',
      'กันชื่อทีมซ้ำให้อัตโนมัติ · มีปุ่มดาวน์โหลดเทมเพลต',
      'ตั้งจำนวนสายและทีมต่อสายได้แบบไม่จำกัด',
      'ปุ่ม "สร้างสายอัตโนมัติ" คำนวณจำนวนสายจากจำนวนทีมทั้งหมด แล้วกระจายทุกทีมให้สมดุล',
    ],
  },
  {
    icon: 'i-lucide-rotate-cw',
    color: 'text-primary',
    title: 'โหมดสุ่มวงล้อ',
    points: [
      'หมุนวงล้อสุ่มทีมเข้าสาย สีแบ่งตามโรงเรียน',
      'เติมอัตโนมัติ: เติมสายให้เต็มทีละสาย ถ้าโรงเรียนซ้ำจะข้ามไปสายถัดไปเอง',
      'หรือปิดเติมอัตโนมัติเพื่อเลือกวางสายเองหลังหมุน',
    ],
  },
  {
    icon: 'i-lucide-hand',
    color: 'text-primary',
    title: 'โหมดจัดเอง (ลากวาง)',
    points: [
      'ลากทีมจากกองไปวางในสาย · ลากย้ายข้ามสาย · ลากคืนกองได้',
      'สายที่วางได้ = ขอบเขียว, วางไม่ได้ (โรงเรียนซ้ำ/เต็ม) = ขอบแดง + สั่น',
      'บนมือถือ/คีย์บอร์ด: แตะเลือกทีม แล้วแตะสายที่ต้องการ',
      'ปุ่ม "จัดที่เหลือทั้งหมด" จัดทีมที่เหลืออัตโนมัติในคลิกเดียว',
    ],
  },
  {
    icon: 'i-lucide-table-2',
    color: 'text-secondary',
    title: 'รอบแบ่งกลุ่ม (Round-Robin)',
    points: [
      'สร้างตารางแข่งทุกคู่ในสายอัตโนมัติ (รองรับจำนวนทีมคี่ด้วยระบบ bye)',
      'กรอกผลแต่ละแมตช์ → ตารางคะแนนอัปเดตทันที',
      'จัดอันดับด้วย: คะแนน → ผลต่างสกอร์ → สกอร์ได้ → ชื่อทีม',
      'ทีมที่ผ่านเข้ารอบ (อันดับต้นของแต่ละสาย) ไฮไลต์ขอบเขียว',
    ],
  },
  {
    icon: 'i-lucide-swords',
    color: 'text-secondary',
    title: 'รอบน็อคเอาท์ (แพ้คัดออก)',
    points: [
      'คัดทีมเข้ารอบตามอันดับ แล้วสร้างสายอัตโนมัติ',
      'Seeding ฉลาด — แชมป์กลุ่มก่อน + เลี่ยงโรงเรียน/สายเดียวกันเจอกันรอบแรก',
      'เติม bye อัตโนมัติเมื่อจำนวนทีมไม่ใช่กำลังของ 2',
      'กรอกผล → ผู้ชนะเลื่อนสายอัตโนมัติจนถึงรอบชิง → ได้แชมป์ 🏆',
    ],
  },
  {
    icon: 'i-lucide-download',
    color: 'text-success',
    title: 'บันทึก & ส่งออก',
    points: [
      'บันทึกอัตโนมัติในเบราว์เซอร์ (localStorage) — ปิดเปิดแล้วทำต่อได้',
      'Export CSV ได้ทุกขั้น: รายชื่อสาย / ตารางคะแนน / ผล bracket',
      'ถอยกลับขั้นก่อนหน้าได้ (ยืนยันก่อนล้างผล)',
    ],
  },
]

const faqs = [
  {
    q: 'ทำไมวางทีมลงสายนี้ไม่ได้?',
    a: 'เพราะสายนั้นมีทีมจากโรงเรียนเดียวกันอยู่แล้ว หรือสายเต็ม — เป็นกติกาหลักของระบบเพื่อความยุติธรรม',
  },
  {
    q: 'ไฟล์ CSV ต้องหน้าตาแบบไหน?',
    a: 'สองคอลัมน์: ชื่อทีม และ โรงเรียน มีหรือไม่มีแถวหัวตารางก็ได้ ดาวน์โหลดเทมเพลตจากปุ่มในหน้าแรกได้เลย',
  },
  {
    q: 'เริ่มรอบแบ่งกลุ่มไม่ได้ กดปุ่มแล้วไม่ทำงาน?',
    a: 'ทุกสายต้องมีอย่างน้อย 2 ทีมก่อน จึงจะสร้างตารางแข่งได้',
  },
  {
    q: 'กรอกผลผิด แก้ได้ไหม?',
    a: 'ได้ทุกเมื่อ ระบบคำนวณตารางคะแนนใหม่ให้อัตโนมัติ ถ้าเป็นรอบน็อคเอาท์ที่ผู้ชนะผ่านไปแล้ว ระบบจะล้างผลแมตช์ถัดไปที่เกี่ยวข้องให้',
  },
  {
    q: 'รอบน็อคเอาท์เสมอได้ไหม?',
    a: 'ไม่ได้ ต้องมีผู้ชนะเสมอ (รอบแบ่งกลุ่มเสมอได้ ได้ทีมละ 1 คะแนน)',
  },
  {
    q: 'ข้อมูลหายไหมถ้าปิดเบราว์เซอร์?',
    a: 'ไม่หาย เก็บในเครื่องคุณเอง แต่ถ้ากด "ล้างทั้งหมด" หรือเปิดบนเครื่อง/เบราว์เซอร์อื่นจะเริ่มใหม่',
  },
]
</script>

<template>
  <UContainer class="py-6">
    <!-- top bar -->
    <div class="mb-6 flex items-center justify-between gap-4">
      <div class="flex items-center gap-3">
        <div
          class="grid size-11 flex-none place-items-center rounded-xl text-xl shadow-lg"
          style="background: linear-gradient(135deg, #22d3ee, #8b5cf6 55%, #f0299c)"
        >
          📖
        </div>
        <div>
          <h1 class="text-highlighted text-xl font-bold tracking-tight sm:text-2xl">วิธีใช้งาน</h1>
          <p class="text-muted text-sm">คู่มือระบบจับสาย & จัดการแข่งขัน E-Sport</p>
        </div>
      </div>
      <UButton to="/" color="primary" variant="soft" icon="i-lucide-arrow-left"> กลับหน้าแอป </UButton>
    </div>

    <!-- the rule -->
    <UAlert
      color="primary"
      variant="soft"
      icon="i-lucide-scale"
      title="กติกาหลักของระบบ"
      description="ทีมจากโรงเรียนเดียวกันจะอยู่สายเดียวกันไม่ได้ — บังคับใช้ทุกโหมด ทั้งสุ่ม ลากวาง และการจัดสายรอบน็อคเอาท์"
      class="mb-6"
    />

    <!-- quick start -->
    <UCard class="mb-6">
      <template #header>
        <h2 class="text-muted text-sm font-semibold uppercase tracking-wider">เริ่มต้นใน 4 ขั้น</h2>
      </template>
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div
          v-for="(s, i) in steps"
          :key="s.label"
          class="border-default bg-elevated/40 relative rounded-xl border p-4"
        >
          <span
            class="bg-primary/15 text-primary absolute right-3 top-3 grid size-6 place-items-center rounded-full text-xs font-bold"
          >
            {{ i + 1 }}
          </span>
          <UIcon :name="s.icon" class="text-primary mb-2 size-7" />
          <div class="text-highlighted font-bold">{{ s.label }}</div>
          <div class="text-muted mt-0.5 text-xs">{{ s.hint }}</div>
        </div>
      </div>
    </UCard>

    <!-- features -->
    <div class="mb-6 grid gap-4 md:grid-cols-2">
      <UCard v-for="f in features" :key="f.title">
        <template #header>
          <div class="flex items-center gap-2.5">
            <UIcon :name="f.icon" class="size-5" :class="f.color" />
            <h3 class="text-highlighted font-bold">{{ f.title }}</h3>
          </div>
        </template>
        <ul class="space-y-2">
          <li v-for="(p, i) in f.points" :key="i" class="flex gap-2 text-sm">
            <UIcon name="i-lucide-check" class="text-success mt-0.5 size-4 flex-none" />
            <span class="text-default leading-relaxed">{{ p }}</span>
          </li>
        </ul>
      </UCard>
    </div>

    <!-- CSV format -->
    <UCard class="mb-6">
      <template #header>
        <div class="flex items-center gap-2.5">
          <UIcon name="i-lucide-file-spreadsheet" class="text-primary size-5" />
          <h3 class="text-highlighted font-bold">รูปแบบไฟล์ CSV</h3>
        </div>
      </template>
      <p class="text-muted mb-3 text-sm">
        สองคอลัมน์: ชื่อทีม และ โรงเรียน (มีแถวหัวตารางหรือไม่มีก็ได้) เปิด/บันทึกจาก Excel หรือ Google Sheets ได้
      </p>
      <pre
        class="border-default bg-elevated/60 overflow-x-auto rounded-lg border p-3 text-[13px] leading-relaxed"
      ><code>ชื่อทีม,โรงเรียน
Dragon Squad,ร.ร.สวนกุหลาบ
Phoenix Five,ร.ร.เตรียมอุดม
Shadow Hunters,ร.ร.บดินทรเดชา</code></pre>
    </UCard>

    <!-- FAQ -->
    <UCard class="mb-6">
      <template #header>
        <div class="flex items-center gap-2.5">
          <UIcon name="i-lucide-message-circle-question" class="text-secondary size-5" />
          <h3 class="text-highlighted font-bold">คำถามที่พบบ่อย</h3>
        </div>
      </template>
      <div class="divide-default divide-y">
        <div v-for="(item, i) in faqs" :key="i" class="py-3 first:pt-0 last:pb-0">
          <div class="text-highlighted flex items-start gap-2 text-sm font-semibold">
            <span class="text-primary">Q.</span>
            <span>{{ item.q }}</span>
          </div>
          <div class="text-muted mt-1 flex items-start gap-2 text-sm leading-relaxed">
            <span class="text-success font-semibold">A.</span>
            <span>{{ item.a }}</span>
          </div>
        </div>
      </div>
    </UCard>

    <div class="flex justify-center">
      <UButton to="/" color="primary" size="lg" icon="i-lucide-rocket"> เริ่มใช้งานเลย </UButton>
    </div>
  </UContainer>
</template>
