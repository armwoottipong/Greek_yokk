/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#FAF8F5',
          100: '#F5EBE1',
          200: '#E6D3C2',
          500: '#8C532B',
          600: '#78350F',
          800: '#451A03',
          900: '#2A1002'
        },
        warm: {
          50: '#FAF9F6',
          100: '#F4F1EA',
          200: '#E9E4D8',
          500: '#78716C',
          800: '#292524',
          900: '#1C1917'
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
