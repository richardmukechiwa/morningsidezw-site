export default {
  // Scan all HTML and JS files in the repository so Tailwind includes used classes
  content: ["./**/*.{html,js}"],
  // Ensure commonly-used layout classes are always included while debugging build
  safelist: [
    { pattern: /max-w-.*/ },
    { pattern: /md:.*/ },
    { pattern: /px-.*/ },
    { pattern: /py-.*/ },
    { pattern: /grid-.*/ },
    { pattern: /flex-.*/ }
  ],
  theme: {
    extend: {}
  }
}
