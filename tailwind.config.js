/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./*.html",
    "./**/*.html",
    "./scripts/**/*.js"
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
    'project-card', 'open-workflow', 'workflowModal',
    'hidden','flex','items-center','justify-center',
    'absolute','relative','top-1/2','translate-y-1/2',
    'z-50','p-4','max-w-3xl','w-full','rounded-lg',
    'bg-white','text-gray-500','text-xs','mx-auto','mt-2','mt-3'
  ],
  plugins: [],
};
