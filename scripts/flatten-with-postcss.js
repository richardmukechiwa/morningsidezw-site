const fs = require('fs');
const path = require('path');
const postcss = require('postcss');

const file = path.resolve(__dirname, '..', 'output.css');
const css = fs.readFileSync(file, 'utf8');

const root = postcss.parse(css);
let lifted = 0;

root.walkRules(rule => {
  // Look for nested at-rules inside this rule
  const toRemove = [];
  rule.each(node => {
    if (node.type === 'atrule' && node.name === 'media') {
      // Check for relational 'width >=' pattern
      const rel = node.params.match(/width\s*>\s*=\s*([0-9.]+rem)/i);
      if (rel) {
        const bp = rel[1];
        // Create a top-level media at-rule
        const media = postcss.atRule({ name: 'media', params: `(min-width: ${bp})` });
        const newRule = postcss.rule({ selector: rule.selector });
        // Move the declarations from the nested at-rule inside the new rule
        node.walk(nodeChild => {
          if (nodeChild.type === 'decl' || nodeChild.type === 'rule') {
            newRule.append(nodeChild.clone());
          }
        });
        media.append(newRule);
        // Insert the media at-rule after the parent rule
        rule.parent.insertAfter(rule, media);
        toRemove.push(node);
        lifted++;
      }
    }
  });

  // Remove the nested at-rules we lifted
  toRemove.forEach(n => n.remove());
  // If the rule has no declarations left, remove it
  if (!rule.nodes || rule.nodes.length === 0) {
    rule.remove();
  }
});

const out = root.toString();
fs.writeFileSync(file, out, 'utf8');
console.log('flatten-with-postcss: lifted=', lifted);
