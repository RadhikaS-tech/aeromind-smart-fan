/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        ink: {
          950: '#060a12',
          900: '#0a1020',
          800: '#0f1830',
          700: '#16213d',
          600: '#1e2a4d',
          500: '#2a385f',
        },
        breeze: {
          50: '#eafaff',
          100: '#c8f1ff',
          200: '#99e6ff',
          300: '#5dd4ff',
          400: '#22c2ff',
          500: '#06a3ec',
          600: '#0a82c4',
          700: '#0c669c',
          800: '#0f557f',
          900: '#0e4a6b',
        },
        mint: {
          400: '#3ad6a0',
          500: '#16b888',
          600: '#0d9470',
        },
        sun: {
          400: '#ffb648',
          500: '#ff9326',
          600: '#e2760f',
        },
        rose: {
          400: '#ff7a8a',
          500: '#f1556a',
          600: '#d63a52',
        },
      },
      boxShadow: {
        glow: '0 0 40px -8px rgba(34, 194, 255, 0.45)',
        'glow-mint': '0 0 30px -6px rgba(54, 214, 160, 0.4)',
        panel: '0 18px 50px -20px rgba(2, 8, 20, 0.7)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease both',
        'rise-in': 'riseIn 0.45s cubic-bezier(0.16,1,0.3,1) both',
        'spin-slow': 'spin 14s linear infinite',
        'pulse-soft': 'pulseSoft 2.4s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        riseIn: {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSoft: {
          '0%,100%': { opacity: '0.55' },
          '50%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
