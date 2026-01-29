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
        // Partrunner Brand Colors (from Figma design)
        partrunner: {
          // Primary Yellow
          yellow: '#FFD840',
          'yellow-dark': '#FED330',
          'yellow-accent': '#F29F05',
          'yellow-light': '#FFF9E5',
          'yellow-50': '#FFFBEB',
          'yellow-100': '#FEF3C7',
          
          // Neutral/Dark
          black: '#14142B',
          charcoal: '#2D2D2D',
          'gray-dark': '#4E4B66',
          'gray-light': '#D9DBE9',
          
          // Backgrounds
          'bg-main': '#F5F7FB',
          'bg-card': '#FFFFFF',
          
          // Status Colors
          green: '#26B76E',
          red: '#FF4757',
          teal: '#10C89B',
        },
        // Legacy brand colors (for backwards compatibility)
        brand: {
          yellow: '#FFD840',
          red: '#FF4757',
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
        'partrunner': '0 4px 14px 0 rgba(255, 216, 64, 0.25)',
        'partrunner-lg': '0 10px 40px 0 rgba(255, 216, 64, 0.3)',
        'card': '0 2px 8px 0 rgba(0, 0, 0, 0.04)',
        'card-hover': '0 8px 24px 0 rgba(0, 0, 0, 0.08)',
        'header': '0 54px 58px -12px rgba(233, 235, 244, 0.6)',
      },
      borderRadius: {
        '2xl': '0.75rem',
        '3xl': '1rem',
        '4xl': '1.5rem',
      },
    },
  },
  plugins: [],
}
