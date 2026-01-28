/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        // Partrunner Brand Colors
        partrunner: {
          yellow: '#F5C341',
          'yellow-dark': '#D4A626',
          'yellow-light': '#FFD966',
          'yellow-50': '#FFFBEB',
          'yellow-100': '#FEF3C7',
          black: '#1A1A1A',
          charcoal: '#2D2D2D',
          'gray-dark': '#3D3D3D',
        },
        // Legacy brand colors (for backwards compatibility)
        brand: {
          yellow: '#F5C341',
          red: '#B91C1C',
        },
      },
      animation: {
        'spin-slow': 'spin 2s linear infinite',
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      boxShadow: {
        'partrunner': '0 4px 14px 0 rgba(245, 195, 65, 0.25)',
        'partrunner-lg': '0 10px 40px 0 rgba(245, 195, 65, 0.3)',
        'card': '0 2px 8px 0 rgba(0, 0, 0, 0.08)',
        'card-hover': '0 8px 24px 0 rgba(0, 0, 0, 0.12)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
}
