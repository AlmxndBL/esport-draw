// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-01',

  // Client-only app (canvas + localStorage). SPA mode avoids SSR hydration
  // mismatches and keeps the deployment a static bundle.
  ssr: false,

  devtools: { enabled: true },

  modules: ['@nuxt/ui', '@vueuse/nuxt'],

  css: ['~/assets/css/main.css'],

  // Esports look — force the dark theme.
  colorMode: {
    preference: 'dark',
    fallback: 'dark',
  },

  app: {
    head: {
      htmlAttrs: { lang: 'th' },
      title: 'ระบบหมุนวงล้อจับสาย E-Sport',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        {
          name: 'description',
          content: 'สุ่มทีมด้วยวงล้อ จัดลงสายแข่งขัน E-Sport พร้อมเช็กกติกาโรงเรียน',
        },
      ],
    },
  },
})
