module.exports = {
  content: [
    "./*.html",
    "./blog/**/*.html",
    "./admin/**/*.html"
  ],
  theme: {
    extend: {
      colors: {
        brandnavy: "#0A1B2A",
        brandaccent: "#FF6A00",
      },
      fontFamily: {
        inter: ["Inter", "ui-sans-serif", "system-ui"]
      }
    },
  },
  plugins: [],
};
