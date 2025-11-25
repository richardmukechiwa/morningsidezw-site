/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./site/**/*.{html,js}",      // All HTML and JS inside site/
    "./site/**/*.html",           // In case nested HTML folders
    "./site/styles/**/*.css"      // Include any other CSS you create
  ],
  theme: {
    extend: {
      colors: {
        primary: "#0A1B2A",
        accent: "#FF6A00"
      },
      fontFamily: {
        inter: ["Inter", "sans-serif"]
      }
    }
  },
  plugins: [],
};
