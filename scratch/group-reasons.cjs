const fs = require('fs');
const report = JSON.parse(fs.readFileSync('C:/Users/Poste/Desktop/SaaS Astro/freecipies-blog/scratch/strict-report-improved.json', 'utf8'));

const styleBlockVals = {};
const inlineVals = {};
const tailwindVals = {};

report.forEach(f => {
  f.styleBlocks.forEach(s => {
    styleBlockVals[s.text] = (styleBlockVals[s.text] || 0) + 1;
  });
  f.inlineStyles.forEach(i => {
    inlineVals[i.text] = (inlineVals[i.text] || 0) + 1;
  });
  f.tailwindArbitrary.forEach(t => {
    tailwindVals[t.text] = (tailwindVals[t.text] || 0) + 1;
  });
});

console.log('--- Top Style Block Hardcoded Violations ---');
const sortedStyle = Object.entries(styleBlockVals).sort((a, b) => b[1] - a[1]);
sortedStyle.slice(0, 50).forEach(([val, count]) => {
  console.log(`${count}x: ${val}`);
});

console.log('\n--- Top Inline Styles ---');
const sortedInline = Object.entries(inlineVals).sort((a, b) => b[1] - a[1]);
sortedInline.forEach(([val, count]) => {
  console.log(`${count}x: ${val}`);
});

console.log('\n--- Top Tailwind Arbitrary Classes ---');
const sortedTailwind = Object.entries(tailwindVals).sort((a, b) => b[1] - a[1]);
sortedTailwind.forEach(([val, count]) => {
  console.log(`${count}x: ${val}`);
});
