/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f5f7ff',
          100: '#ebf0ff',
          200: '#dbe2ff',
          300: '#bfcbff',
          400: '#9ba9ff',
          500: '#6d7bff',
          600: '#4e55fa',
          700: '#3e42e4',
          800: '#3337b9',
          900: '#2d3094',
        },
      },
    },
  },
  plugins: [],
}
