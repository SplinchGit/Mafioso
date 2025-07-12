/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'mafia-red': '#ff6b6b',
        'mafia-crimson': '#dc2626',
        'mafia-gold': '#fbbf24',
        'mafia-dark': '#111827',
        'mafia-darker': '#0f172a',
        'mafia-gray-800': '#1f2937',
        'mafia-gray-700': '#374151',
        'mafia-gray-600': '#4b5563',
        'mafia-gray-500': '#6b7280',
        'mafia-gray-400': '#9ca3af',
        'mafia-gray-300': '#d1d5db',
        'blood': '#8b0000',
        'money': '#10b981',
      },
      fontFamily: {
        'serif': ['Georgia', 'Cambria', 'serif'],
        'mono': ['Monaco', 'Consolas', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-slow': 'bounce 2s infinite',
      }
    },
  },
  plugins: [],
}