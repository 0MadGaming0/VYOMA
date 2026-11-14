/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── Brand Core ──
        navy:  { DEFAULT: '#16324F', light: '#1E4166', dark: '#0D2035', muted: '#3A5570' },
        teal:  { DEFAULT: '#2A9D8F', light: '#35B8A8', dark: '#1F7A6E', soft: '#7DCFCA' },
        // ── Neutral surfaces ──
        white:   '#FFFFFF',
        offwhite: '#F7F9FB',
        ghost:   '#EEF2F6',
        border:  '#D6E0EB',
        'border-strong': '#B0C4D8',
        line:    '#D6E0EB',
        // ── Typography ──
        ink:     '#16324F',  // alias of navy for text
        body:    '#2D4A63',  // slightly lighter navy for body text
        muted:   '#6B8AA6',  // secondary text
        dim:     '#A0B4C8',  // placeholder / disabled text
        // ── Semantic ──
        ok:      '#2A9D8F',  // same as teal for ok states
        warn:    '#E8972D',  // amber — only for warnings, not brand
        crit:    '#C0392B',  // red — only for critical alerts
        info:    '#3A7FC1',  // blue — only for informational
        // ── Legacy aliases (kept for component compat) ──
        night:  '#F7F9FB',
        hull:   '#16324F',
        deep:   '#EEF2F6',
        surface:'#FFFFFF',
        panel:  '#FFFFFF',
        graphite:'#F0F4F8',
        slate:  '#E8EFF6',
        lift:   '#D6E0EB',
        cyan:   { DEFAULT: '#2A9D8F', soft: '#7DCFCA' },
        steel:  '#3A7FC1',
        mute:   '#6B8AA6',
      },
      borderColor: ({ theme }) => ({
        ...theme('colors'),
        DEFAULT: '#D6E0EB',
        border: '#D6E0EB',
        'border-strong': '#B0C4D8',
        line: '#D6E0EB',
      }),
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        body:    ['"Inter"', 'system-ui', 'sans-serif'],
        mono:    ['"IBM Plex Mono"', '"Space Mono"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        '2xs': ['10px', { lineHeight: '14px', letterSpacing: '0.08em' }],
      },
      boxShadow: {
        'card':   '0 1px 4px rgba(22,50,79,0.06), 0 1px 2px rgba(22,50,79,0.04)',
        'card-md':'0 2px 8px rgba(22,50,79,0.08), 0 1px 3px rgba(22,50,79,0.05)',
        'card-lg':'0 4px 16px rgba(22,50,79,0.10), 0 2px 6px rgba(22,50,79,0.06)',
        'teal':   '0 0 0 3px rgba(42,157,143,0.20)',
        'inner':  'inset 0 1px 0 rgba(255,255,255,0.8), inset 0 -1px 0 rgba(22,50,79,0.06)',
        // Legacy
        glow:     '0 0 0 1px rgba(42,157,143,0.20)',
        'glow-sm':'0 0 0 1px rgba(42,157,143,0.12)',
        panel:    '0 1px 4px rgba(22,50,79,0.08)',
      },
      borderRadius: {
        'sm': '4px',
        DEFAULT: '6px',
        'md': '8px',
        'lg': '10px',
        'xl': '12px',
        '2xl': '16px',
        '3xl': '20px',
      },
      keyframes: {
        page:      { from: { opacity: '0', transform: 'translateY(4px)' }, to: { opacity: '1', transform: 'none' } },
        pulseDot:  { '0%,100%': { opacity: '1' }, '50%': { opacity: '.25' } },
        fadeUp:    { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        slideIn:   { from: { opacity: '0', transform: 'translateX(-6px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
        shimmer:   { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        blink:     { '0%,100%': { opacity: '1' }, '50%': { opacity: '0' } },
        pulse:     { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.5' } },
      },
      animation: {
        page:      'page .22s ease-out',
        pulseDot:  'pulseDot 1.6s ease-in-out infinite',
        fadeUp:    'fadeUp 0.3s ease-out',
        slideIn:   'slideIn 0.25s ease-out',
        shimmer:   'shimmer 2s linear infinite',
        blink:     'blink 1s step-end infinite',
        pulse:     'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite',
      },
    },
  },
  plugins: [],
};
