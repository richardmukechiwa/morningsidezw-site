module.exports = {
  plugins: [
    // Run Tailwind first, then resolve nested rules it may emit, then autoprefix
    require('@tailwindcss/postcss'),
    // Use postcss-nested to flatten Tailwind's nested at-rules into top-level media queries
    require('postcss-nested'),
    require('autoprefixer')
  ]
}
