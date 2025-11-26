module.exports = {
  // Scan all HTML and JS files in the repository so Tailwind includes used classes
  content: ["./**/*.{html,js}"],
  // Ensure commonly-used layout classes are always included while debugging build
  safelist: [
    // Generic regex patterns (keep for broad coverage)
    { pattern: /max-w-.*/ },
    { pattern: /px-.*/ },
    { pattern: /py-.*/ },
    { pattern: /grid-.*/ },
    { pattern: /flex-.*/ },
    // Explicit responsive classes used in templates to force inclusion
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
    extend: {}
  }
}
