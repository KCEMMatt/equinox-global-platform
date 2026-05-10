import type { Config } from 'tailwindcss'
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: { navy: '#08264A', gold: '#C59A42', ivory: '#F7F2EA', charcoal: '#1E252C' },
      fontFamily: { serif: ['Georgia', 'serif'], sans: ['Inter', 'ui-sans-serif', 'system-ui'] }
    },
  },
  plugins: [],
}
export default config
