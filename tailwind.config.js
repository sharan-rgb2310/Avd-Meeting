/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#0B1736',
          50: '#F2F5FA',
          700: '#152449',
          800: '#0F1D3D',
          900: '#0B1736',
          950: '#060E22',
        },
        brand: {
          DEFAULT: '#2563EB',
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
        },
        accent: '#38BDF8',
        cyan: { DEFAULT: '#06B6D4' },
        ink: '#0F172A',
        muted: '#64748B',
        line: '#E2E8F0',
        canvas: '#F5F8FC',
        success: '#10B981',
        warning: '#F59E0B',
        danger: '#EF4444',
        purple: '#7C3AED',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['11px', '16px'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(15, 23, 42, 0.06)',
        pop: '0 10px 30px -10px rgba(11, 23, 54, 0.25)',
        panel: '0 20px 45px -20px rgba(11, 23, 54, 0.35)',
      },
      borderRadius: {
        xl: '12px',
        '2xl': '14px',
      },
      keyframes: {
        'fade-in': { from: { opacity: 0 }, to: { opacity: 1 } },
        'scale-in': { from: { opacity: 0, transform: 'translateY(8px) scale(.98)' }, to: { opacity: 1, transform: 'none' } },
        'slide-in-right': { from: { transform: 'translateX(16px)', opacity: 0 }, to: { transform: 'none', opacity: 1 } },
        'slide-in-left': { from: { transform: 'translateX(-100%)' }, to: { transform: 'none' } },
      },
      animation: {
        'fade-in': 'fade-in .18s ease-out',
        'scale-in': 'scale-in .18s cubic-bezier(.16,1,.3,1)',
        'slide-in-right': 'slide-in-right .22s ease-out',
        'slide-in-left': 'slide-in-left .22s ease-out',
      },
    },
  },
  plugins: [],
}
