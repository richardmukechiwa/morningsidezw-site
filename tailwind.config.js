/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./*.html",
    "./**/*.html",
    "./styles/**/*.css",
    "./scripts/**/*.js"
  ],
  theme: {
    extend: {
      colors: {
        "brand-navy": "#0A1B2A",
        "brand-accent": "#FF6A00",
      },
    },
  },
  plugins: [],
};
