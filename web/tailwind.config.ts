import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // Fragify brand — naranja CS2 sobre fondo oscuro
        brand: {
          50:  '#fff7ed',
          100: '#ffedd5',
          400: '#fb923c',
          500: '#f97316',  // Principal
          600: '#ea6d0a',
          900: '#431407',
        },
        surface: {
          900: '#0d0d0f',
          800: '#141418',
          700: '#1c1c22',
          600: '#26262e',
          500: '#32323d',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}

export default config
