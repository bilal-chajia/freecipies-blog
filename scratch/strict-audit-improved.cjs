const fs = require('fs');
const path = require('path');

const srcDir = path.join(process.cwd(), 'src');

function getFiles(dir, ext) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFiles(file, ext));
    } else {
      if (file.endsWith(ext)) {
        results.push(file);
      }
    }
  });
  return results;
}

const astroFiles = getFiles(srcDir, '.astro');
const report = [];

const allowedKeywords = new Set([
  '0', '0px', '100%', '50%', '100vh', '100vw', 'auto', 'none', 'transparent', 'inherit', 'initial', 
  'unset', 'currentcolor', 'bold', 'normal', 'italic', 'underline', 
  'center', 'left', 'right', 'justify', 'absolute', 'relative', 'fixed', 'sticky', 'static',
  'flex', 'grid', 'block', 'inline-block', 'inline', 'inline-flex', 'table', 'table-cell',
  'nowrap', 'wrap', 'pointer', 'default', 'hidden', 'visible', 'solid', 'dashed', 'dotted',
  'box-sizing', 'border-box', 'content-box', 'collapse', 'separate', 'row', 'column',
  'space-between', 'space-around', 'space-evenly', 'stretch', 'baseline', 'column-reverse', 'row-reverse',
  '0 auto', 'auto 0', 'auto auto', 'none', 'transparent', '1px', '1px solid transparent',
  '1px solid var(--border)', '1px solid var(--border-strong)', '1px solid var(--border-subtle)',
  '1px solid currentColor', 'currentColor', 'scroll', 'contain', 'cover'
]);

const checkProps = [
  'color', 'background', 'background-color', 'border', 'border-color', 'border-top-color',
  'border-bottom-color', 'border-left-color', 'border-right-color', 'border-radius', 
  'border-top-left-radius', 'border-top-right-radius', 'border-bottom-left-radius', 'border-bottom-right-radius',
  'box-shadow', 'text-shadow', 'font-size', 'font-weight', 'line-height', 'font-family',
  'gap', 'column-gap', 'row-gap', 'padding', 'padding-top', 'padding-bottom', 'padding-left', 'padding-right',
  'margin', 'margin-top', 'margin-bottom', 'margin-left', 'margin-right', 'top', 'bottom', 'left', 'right',
  'width', 'height', 'max-width', 'max-height', 'min-width', 'min-height', 'z-index', 'transition', 'transition-duration',
  'transition-timing-function'
];

astroFiles.forEach(filePath => {
  const content = fs.readFileSync(filePath, 'utf-8');
  const relativePath = path.relative(process.cwd(), filePath).replace(/\\/g, '/');
  
  const fileIssues = {
    file: relativePath,
    styleBlocks: [],
    inlineStyles: [],
    tailwindArbitrary: []
  };

  // 1. Audit style blocks with multi-line support
  const styleBlockRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  let match;
  while ((match = styleBlockRegex.exec(content)) !== null) {
    const styleContent = match[1];
    
    // Remove comments
    const cleanStyleContent = styleContent.replace(/\/\*[\s\S]*?\*\//g, '');
    
    // Find all rules (content between { and })
    const ruleRegex = /\{([^}]+)\}/g;
    let ruleMatch;
    while ((ruleMatch = ruleRegex.exec(cleanStyleContent)) !== null) {
      const declarationsBlock = ruleMatch[1];
      const declarations = declarationsBlock.split(';');
      
      declarations.forEach(decl => {
        const trimmed = decl.trim().replace(/\s+/g, ' ');
        if (!trimmed) return;
        
        const colonIdx = trimmed.indexOf(':');
        if (colonIdx === -1) return;
        
        const prop = trimmed.slice(0, colonIdx).trim().toLowerCase();
        const val = trimmed.slice(colonIdx + 1).trim();
        const valLower = val.toLowerCase();
        
        if (checkProps.includes(prop)) {
          // Check if value uses tokens
          if (!val.includes('var(') && !val.includes('calc(var(') && !val.includes('clamp(')) {
            // Check allowed values/keywords
            let isAllowed = allowedKeywords.has(valLower);
            
            // Special rules
            if (!isAllowed) {
              // Allow simple 0/0px/0rem/0% or 1px border/width/height (standard reset/hairlines)
              if (/^0(px|rem|em|%)?$/.test(valLower)) {
                isAllowed = true;
              } else if (/^-?\d+px$/.test(valLower) && (valLower === '1px' || valLower === '-1px' || valLower === '2px' || valLower === '-2px')) { // small hairlines/alignments
                isAllowed = true;
              } else if (/^\d+(?:\.\d+)?%$/.test(valLower)) { // Allow percentages for sizing
                isAllowed = true;
              } else if (prop === 'border' && (valLower === 'none' || valLower.includes('transparent'))) {
                isAllowed = true;
              } else if (prop === 'z-index') { // z-index doesn't bypass any typography or color system
                isAllowed = true;
              } else if (prop === 'line-height' && valLower === '1') {
                isAllowed = true;
              } else if (prop === 'border-radius' && valLower === '50%') { // Circles are allowed
                isAllowed = true;
              } else if (prop === 'transition' && valLower === 'none') {
                isAllowed = true;
              } else if ((prop === 'width' || prop === 'height' || prop === 'border-width') && valLower === '1px') {
                isAllowed = true;
              }
            }
            
            if (!isAllowed) {
              // Find approximate line in the original content
              // We search for the declaration text in the original content to find its line number
              const declLines = styleContent.split('\n');
              let foundLine = -1;
              for (let i = 0; i < declLines.length; i++) {
                if (declLines[i].includes(prop)) {
                  foundLine = i + 1;
                  break;
                }
              }
              fileIssues.styleBlocks.push({
                line: foundLine,
                text: `${prop}: ${val};`,
                reason: `Hardcoded property '${prop}: ${val}'`
              });
            }
          }
        }
      });
    }
  }

  // 2. Audit inline style attributes
  const inlineStyleRegex = /style=["']([^"']+)["']/gi;
  let inlineMatch;
  while ((inlineMatch = inlineStyleRegex.exec(content)) !== null) {
    const styleVal = inlineMatch[1];
    // Allow display: none; and simple dynamic expressions if they contain var(
    if (!styleVal.includes('var(')) {
      const trimmed = styleVal.trim().toLowerCase();
      const allowedInlines = ['display: none;', 'display:none', 'display: none', 'position: absolute;', 'position:absolute', 'width: 100%; height: 100%; object-fit: cover;', 'width:100%;height:100%;object-fit:cover;'];
      if (!allowedInlines.includes(trimmed)) {
        fileIssues.inlineStyles.push({ text: inlineMatch[0], reason: 'Inline style without CSS tokens' });
      }
    }
  }

  // 3. Audit Tailwind arbitrary classes
  const classRegex = /class(?:Name)?=["']([^"']+)["']/gi;
  let classMatch;
  while ((classMatch = classRegex.exec(content)) !== null) {
    const classVal = classMatch[1];
    const arbitraryClasses = classVal.split(/\s+/).filter(cls => /-\[[^\]]+\]/.test(cls));
    arbitraryClasses.forEach(cls => {
      if (!cls.includes('var(')) {
        // Allow aspect-[4/3] etc
        if (!cls.startsWith('aspect-[')) {
          fileIssues.tailwindArbitrary.push({ text: cls, reason: 'Tailwind arbitrary class bypasses tokens' });
        }
      }
    });
  }

  if (fileIssues.styleBlocks.length > 0 || fileIssues.inlineStyles.length > 0 || fileIssues.tailwindArbitrary.length > 0) {
    report.push(fileIssues);
  }
});

const reportPath = path.join(__dirname, 'strict-report-improved.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
console.log(`Improved strict audit completed. Found issues in ${report.length} files. Report saved to: ${reportPath}`);
