const fs = require('fs');
const path = require('path');
const file = path.resolve(__dirname, '..', 'output.css');
let css = fs.readFileSync(file, 'utf8');

// This script looks for patterns like:
// .md\:h-80 {\n  @media (width >= 48rem) {\n    height: ...;\n  }\n}
// and rewrites to:
// @media (min-width: 48rem) { .md\:h-80 { height: ...; } }

const nestedAtRuleRegex = /([\S\s]*?)(\.[A-Za-z0-9_\\:\-]+)\s*\{\s*@media\s*\(\s*width\s*>=\s*([0-9.]+rem)\s*\)\s*\{([\s\S]*?)\}\s*\}/g;

let replacements = 0;
css = css.replace(nestedAtRuleRegex, (m, before, selector, bp, inner) => {
  // Trim whitespace from inner declarations
  const decls = inner.trim();
  replacements++;
  return `@media (min-width: ${bp}) { ${selector} { ${decls} } }`;
});

// Also handle cases where selector may be more complex (multiple classes separated)
// Generic fallback: look for pattern .foo\:bar { @media (width >= X) { ... } }
const nestedAtRuleRegex2 = /(\.[^\s\{]+)\s*\{\s*@media\s*\(\s*width\s*>=\s*([0-9.]+rem)\s*\)\s*\{([\s\S]*?)\}\s*\}/g;
css = css.replace(nestedAtRuleRegex2, (m, selector, bp, inner) => {
  const decls = inner.trim();
  replacements++;
  return `@media (min-width: ${bp}) { ${selector} { ${decls} } }`;
});

fs.writeFileSync(file, css, 'utf8');
console.log('flatten-output-css: replacements=', replacements);