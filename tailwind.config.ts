/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0d1219",
        panel: "#1a2634",
        input: "#141e2a",
        active: "#1e2c3a",
        accent: "#00ff00",
      },
    },
  },
  plugins: [],
} 