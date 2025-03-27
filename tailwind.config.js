/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'mine-red': '#FF0000',
        'mine-green': '#00FF00',
        'mine-gold': '#FFD700',
      },
      backgroundColor: {
        'card': '#FFFFFF',
        'button': '#F3F4F6',
        'button-hover': '#E5E7EB',
      },
    },
  },
  plugins: [],
} 