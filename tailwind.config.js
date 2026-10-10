/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      borderRadius: { xl: '14px', '2xl': '24px', '3xl': '32px' },
      colors: {
        white: '#FFFCF6',
        stone: {
          50: '#FBF5EA', 100: '#F4EBDD', 200: '#E8DCCB', 300: '#D2C2B0',
          400: '#7D675B', 500: '#735A4E', 600: '#695246', 700: '#553D32',
          800: '#422D24', 900: '#352522', 950: '#211512'
        },
        brand: {
          50: '#FBF0E9', 100: '#F5E0D6', 200: '#E8BEB0', 300: '#D79787',
          400: '#BE665C', 500: '#9D3533', 600: '#780608', 700: '#680507',
          800: '#580406', 900: '#440305', 950: '#2C0203'
        },
        warm: {
          50: '#FFFCF6', 100: '#FBF5EA', 200: '#E8DCCB',
          500: '#7D675B', 800: '#422D24', 900: '#352522'
        }
      },
      fontFamily: {
        sans: ['Prompt', 'Plus Jakarta Sans', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        number: ['"Plus Jakarta Sans"', 'sans-serif']
      }
    },
  },
  plugins: [],
}
