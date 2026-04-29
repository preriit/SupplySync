/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./public/index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Public Sans', 'system-ui', 'sans-serif'],
        display: ['Manrope', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Existing palette aliases retained for compatibility with current pages.
        orange: {
          DEFAULT: 'hsl(var(--brand))',
          dark: 'hsl(var(--brand-hover))',
          light: '#FB923C',
        },
        slate: {
          DEFAULT: 'hsl(var(--text-strong))',
          light: 'hsl(var(--text-muted))',
        },
        grey: {
          50: 'hsl(var(--app-bg))',
          100: '#F1F5F9',
          200: '#E2E8F0',
        },
        app: {
          bg: 'hsl(var(--app-bg))',
          surface: 'hsl(var(--surface-1))',
          muted: 'hsl(var(--surface-2))',
          sidebar: 'hsl(var(--surface-sidebar))',
          'sidebar-hover': 'hsl(var(--surface-sidebar-hover))',
          'sidebar-active': 'hsl(var(--surface-sidebar-active))',
          border: 'hsl(var(--border-soft))',
          'border-strong': 'hsl(var(--border-strong))',
          text: 'hsl(var(--text-strong))',
          'text-muted': 'hsl(var(--text-muted))',
          'text-on-dark': 'hsl(var(--text-on-dark))',
          success: 'hsl(var(--success))',
          warning: 'hsl(var(--warning))',
          danger: 'hsl(var(--danger))',
        },
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        'card-hover': '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        soft: 'var(--shadow-soft)',
        panel: 'var(--shadow-card)',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        card: 'var(--radius-card)',
        input: 'var(--radius-input)',
        pill: 'var(--radius-pill)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};