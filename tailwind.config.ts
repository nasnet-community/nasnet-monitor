import type { Config } from 'tailwindcss'
import animate from 'tailwindcss-animate'

const config: Config = {
  darkMode: ['selector', '[data-theme="dark"]'],
  content: ['./frontend/index.html', './frontend/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        border: 'var(--border)',
        input: 'var(--input)',
        ring: 'var(--ring)',
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)',
        },
        popover: {
          DEFAULT: 'var(--popover)',
          foreground: 'var(--popover-foreground)',
        },
        primary: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          foreground: 'var(--secondary-foreground)',
        },
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--accent-foreground)',
        },
        destructive: {
          DEFAULT: 'var(--destructive)',
          foreground: 'var(--destructive-foreground)',
        },

        surface: 'var(--surface)',
        card2: 'var(--card2)',
        'border-strong': 'var(--border-strong)',
        faint: 'var(--faint)',
        track: 'var(--track)',
        grid: 'var(--grid)',

        status: {
          online: 'var(--status-online)',
          warn: 'var(--status-warn)',
          danger: 'var(--status-danger)',
          idle: 'var(--status-idle)',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 4px)',
        sm: 'calc(var(--radius) - 6px)',
        card: '16px',
      },
      fontFamily: {
        sans: ['Geist', 'system-ui', 'sans-serif'],
        mono: ['Geist Mono', 'ui-monospace', 'monospace'],
      },
      keyframes: {
        'nas-pulse': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.35', transform: 'scale(0.82)' },
        },
        'nas-sweep': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        'nas-float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'nas-dot': {
          '0%, 100%': { opacity: '0.35', transform: 'scale(0.85)' },
          '50%': { opacity: '1', transform: 'scale(1)' },
        },
        'nas-beam': {
          '0%': { strokeDashoffset: '0' },
          '100%': { strokeDashoffset: '-28' },
        },
      },
      animation: {
        'nas-pulse': 'nas-pulse 2.4s ease-in-out infinite',
        'nas-sweep': 'nas-sweep 4s linear infinite',
        'nas-float': 'nas-float 5s ease-in-out infinite',
        'nas-dot': 'nas-dot 1.8s ease-in-out infinite',
        'nas-beam': 'nas-beam 0.6s linear infinite',
      },
    },
  },
  plugins: [animate],
}

export default config
