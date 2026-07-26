/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef6ff',
          100: '#d9ecff',
          200: '#bcdcff',
          300: '#8ec6ff',
          400: '#59a5ff',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgb(0 0 0 / 0.3), 0 8px 24px -12px rgb(0 0 0 / 0.5)',
        glow: '0 0 0 1px rgb(59 130 246 / 0.35), 0 8px 32px -8px rgb(59 130 246 / 0.35)',
      },
      keyframes: {
        // OJO: el fotograma final debe ser `transform: none`, no `translateY(0)`.
        // Cualquier transform distinto de `none` convierte al elemento en bloque
        // contenedor, y eso rompe el posicionamiento de los hijos `position: fixed`
        // (el temporizador de descanso quedaba fuera de la pantalla).
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'none' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'grow-x': {
          from: { transform: 'scaleX(0)' },
          to: { transform: 'scaleX(1)' },
        },
        'pulse-ring': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.45' },
        },
      },
      animation: {
        // `backwards` en lugar de `both`: así no se conserva ningún transform al
        // terminar la animación (ver la nota del keyframe).
        'fade-up': 'fade-up 0.28s cubic-bezier(0.22, 1, 0.36, 1) backwards',
        'fade-in': 'fade-in 0.2s ease-out both',
        'grow-x': 'grow-x 0.5s cubic-bezier(0.22, 1, 0.36, 1) both',
        'pulse-ring': 'pulse-ring 1.6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
