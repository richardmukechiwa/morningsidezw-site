/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./*.html",
    "./**/*.html",
    "./scripts/**/*.js",
  ],
  theme: {
    extend: {
      colors: {
        'brand-navy': '#0A1B2A',
        'brand-accent': '#FF6A00',
      },
    },
  },
  safelist: [
    // Backgrounds & text colors
    { pattern: /(bg|text)-(white|gray-\d{1,3}|brand-(navy|accent)|#?[0-9A-Fa-f]{3,6})/ },
    
    // Borders
    { pattern: /(border|ring)-(white|gray-\d{1,3}|brand-(navy|accent))/ },
    
    // Flex/grid/responsive
    { pattern: /(flex|grid|block|hidden|contents|items-(start|center|end)|justify-(start|center|end|between|around|evenly)|gap-\d+|grid-cols-\d+)/ },
    { pattern: /(md|sm|lg|xl|2xl):.*/ },

    // Widths/heights/paddings/margins
    { pattern: /(w|h|min-w|max-w|min-h|max-h|p|pt|pb|pl|pr|m|mt|mb|ml|mr)-\d+/ },

    // Text sizes / fonts
    { pattern: /(text|font|tracking|leading|line)-.*/ },

    // Shadows / hover / transitions
    { pattern: /(shadow|hover:shadow|hover:opacity|transition|duration|ease|scale)-.*/ },

    // Rounded
    { pattern: /(rounded|rounded-(t|b|l|r)?(full|lg|md|sm)?)/ },

    // Buttons / interactive
    { pattern: /(hover:bg-|hover:text-|hover:opacity-|active:bg-|focus:bg-).*/ },

    // Specific hero, project, modal classes
    'project-card',
    'open-workflow',
    'workflowModal',
    'hidden',
    'flex',
    'items-center',
    'justify-center',
    'absolute',
    'relative',
    'top-1/2',
    'translate-y-1/2',
    'z-50',
    'p-4',
    'max-w-3xl',
    'w-full',
    'rounded-lg',
    'bg-white',
    'text-gray-500',
    'text-xs',
    'mx-auto',
    'mt-2',
    'mt-3'
  ],
  plugins: [],
}

