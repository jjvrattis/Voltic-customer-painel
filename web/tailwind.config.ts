import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: '#FFD700',
        'brand-purple': '#9333EA',
        'brand-blue': '#0047AB',
        'brand-silver': '#D0D5DB',
        volt: {
          gold: '#FFD700',
          purple: '#9333EA',
          dark: '#0C0A1A',
          deeper: '#06040F',
          glass: 'rgba(255,255,255,0.04)',
          'glass-border': 'rgba(147,51,234,0.25)',
        },
      },
      fontFamily: {
        sans: ['var(--font-rajdhani)', 'var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-rajdhani)', 'system-ui', 'sans-serif'],
        body: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'volt-radial': 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(147,51,234,0.18) 0%, transparent 70%)',
        'volt-sidebar': 'linear-gradient(180deg, rgba(147,51,234,0.08) 0%, transparent 60%)',
        'gold-glow': 'radial-gradient(circle, rgba(255,215,0,0.15) 0%, transparent 70%)',
      },
      boxShadow: {
        'glass': '0 4px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
        'glass-purple': '0 4px 32px rgba(147,51,234,0.15), inset 0 1px 0 rgba(255,255,255,0.06)',
        'glass-gold': '0 4px 32px rgba(255,215,0,0.12), inset 0 1px 0 rgba(255,255,255,0.06)',
        'glow-gold': '0 0 20px rgba(255,215,0,0.3), 0 0 60px rgba(255,215,0,0.1)',
        'glow-purple': '0 0 20px rgba(147,51,234,0.4), 0 0 60px rgba(147,51,234,0.15)',
      },
      backdropBlur: {
        glass: '16px',
        'glass-sm': '8px',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        'glow-pulse': 'glowPulse 2.5s ease-in-out infinite',
        'slide-up': 'slideUp 0.3s ease-out',
        'fade-in': 'fadeIn 0.25s ease-out',
        'spin-slow': 'spin 2s linear infinite',
      },
      keyframes: {
        glowPulse: {
          '0%,100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
