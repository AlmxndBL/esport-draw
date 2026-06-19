// Nuxt UI theme tokens. Map semantic colors to Tailwind palettes so every
// component (buttons, alerts, badges...) shares one consistent identity.
export default defineAppConfig({
  ui: {
    colors: {
      primary: 'cyan',
      secondary: 'violet',
      success: 'green',
      info: 'sky',
      warning: 'amber',
      error: 'rose',
      neutral: 'slate',
    },
  },
})
