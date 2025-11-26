/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./site/**/*.{html,js}",
    "./site/**/*.html",
    "./site/styles/**/*.css"
  ],
  safelist: [
    { pattern: /max-w-.*/ },
    { pattern: /px-.*/ },
    { pattern: /py-.*/ },
    { pattern: /grid-.*/ },
    { pattern: /flex-.*/ },
    'md:flex',
    'md:grid-cols-2',
    'md:grid-cols-3',
    'md:h-80',
    'md:mt-0',
    'md:flex-row',
    'md:justify-end',
    'md:text-4xl'
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
  plugins: []
};
