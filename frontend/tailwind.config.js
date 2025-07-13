// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'mafia-red': '#ff0b0b',
        'mafia-crimson': '#dc2626',
        'mafia-gold': '#fbb724',
        'mafia-darker': '#ff1f24',
        'mafia-dark-gray-800': '#2f353a',
        'mafia-gray-800': '#606b74',
        'mafia-gray-500': '#808285',
        'mafia-gray-400': '#9cacaf',
        'mafia-gray-300': '#d1d8db',
        'blood-red': '#B00000',
        'money-money': '#1b9b01',
      }
    },
  },
  plugins: [],
}