const fs = require('fs');
const path = require('path');

const report = require('C:/Users/Poste/Desktop/SaaS Astro/freecipies-blog/scratch/strict-report-improved.json');

const replacementMap = {
  // Colors
  'color: white;': 'color: var(--neutral-25);',
  'color: white !important;': 'color: var(--neutral-25) !important;',
  'color: #fff;': 'color: var(--neutral-25);',
  'color: #fff !important;': 'color: var(--neutral-25) !important;',
  'color: #ffffff;': 'color: var(--neutral-25);',
  'color: #ffffff !important;': 'color: var(--neutral-25) !important;',
  'background: #ffffff !important;': 'background: var(--bg-elevated) !important;',
  'background-color: #ffffff !important;': 'background-color: var(--bg-elevated) !important;',
  'color: #000000 !important;': 'color: var(--text) !important;',
  'color: black !important;': 'color: var(--text) !important;',
  'color: #1a1a1a;': 'color: var(--text);',
  'color: #0f172a;': 'color: var(--text);',
  'background: #ffffff;': 'background: var(--bg-elevated);',
  'background: #fff;': 'background: var(--bg-elevated);',
  'background-color: #ffffff;': 'background-color: var(--bg-elevated);',
  'background-color: #fff;': 'background-color: var(--bg-elevated);',
  'background: #fafafa;': 'background: var(--bg-alt);',
  'background-color: #fafafa;': 'background-color: var(--bg-alt);',
  'background: #f8fafc;': 'background: var(--bg-alt);',
  'background-color: #f8fafc;': 'background-color: var(--bg-alt);',
  'background: #1a1a1a;': 'background: var(--bg-inset);',
  'background-color: #1a1a1a;': 'background-color: var(--bg-inset);',
  'background: #020617;': 'background: var(--bg-inset);',
  'background-color: #020617;': 'background-color: var(--bg-inset);',
  'border-color: #cbd4cc;': 'border-color: var(--border-strong);',
  'border-color: #e2ebe3;': 'border-color: var(--border);',
  'border-color: #edf3ee;': 'border-color: var(--border-subtle);',
  'color: #4b5563;': 'color: var(--text-secondary);',
  'color: #6b7280;': 'color: var(--text-secondary);',
  'color: #9ca3af;': 'color: var(--text-secondary);',
  'background: #ff6b35;': 'background: var(--brand-primary);',
  'background-color: #ff6b35;': 'background-color: var(--brand-primary);',
  'background: #ff5722;': 'background: var(--brand-primary-hover);',
  'background-color: #ff5722;': 'background-color: var(--brand-primary-hover);',
  'background: #ff6600;': 'background: var(--brand-primary);',
  'background-color: #ff6600;': 'background-color: var(--brand-primary);',
  'color: #ff6600;': 'color: var(--brand-secondary-accessible);',

  // Line heights
  'line-height: 1.6;': 'line-height: var(--leading-relaxed);',
  'line-height: 1.5;': 'line-height: var(--leading-normal);',
  'line-height: 1.4;': 'line-height: var(--leading-snug);',
  'line-height: 1.3;': 'line-height: var(--leading-snug);',
  'line-height: 1.2;': 'line-height: var(--leading-tight);',
  'line-height: 1.7;': 'line-height: var(--leading-relaxed);',
  'line-height: 1.8;': 'line-height: var(--leading-relaxed);',
  'line-height: 1.75;': 'line-height: var(--leading-relaxed);',
  'line-height: 1.1;': 'line-height: var(--leading-tight);',
  'line-height: 1.18;': 'line-height: var(--leading-tight);',

  // Font sizes
  'font-size: 0.8125rem;': 'font-size: var(--text-sm);',
  'font-size: 0.85rem;': 'font-size: var(--text-sm);',
  'font-size: 0.9375rem;': 'font-size: var(--text-base);',
  'font-size: 1.0625rem;': 'font-size: var(--text-base);',
  'font-size: 1.35rem;': 'font-size: var(--text-xl);',
  'font-size: 1.75rem;': 'font-size: var(--text-3xl);',
  'font-size: 0.8rem;': 'font-size: var(--text-sm);',
  'font-size: 0.7rem;': 'font-size: var(--text-xs);',
  'font-size: 0.625rem;': 'font-size: var(--text-xs);',
  'font-size: 13px;': 'font-size: var(--text-sm);',
  'font-size: 17px;': 'font-size: var(--text-base);',
  'font-size: 22px;': 'font-size: var(--text-2xl);',
  'font-size: 26px;': 'font-size: var(--text-3xl);',

  // Spacing / Dimensions
  'gap: 6px;': 'gap: calc(var(--space-1) * 1.5);',
  'gap: 5px;': 'gap: calc(var(--space-1) * 1.25);',
  'gap: 0.375rem;': 'gap: calc(var(--space-1) * 1.5);',
  'gap: 0.4rem;': 'gap: calc(var(--space-1) * 1.6);',
  'gap: 0.6rem;': 'gap: calc(var(--space-1) * 2.4);',
  'gap: 10px;': 'gap: calc(var(--space-2) * 1.25);',
  'gap: 0.875rem;': 'gap: calc(var(--space-1) * 3.5);',
  'margin-bottom: 0.3rem;': 'margin-bottom: calc(var(--space-1) * 1.2);',
  'margin: 0.1rem 0;': 'margin: calc(var(--space-1) * 0.4) var(--space-0);',
  'padding: 5px 11px;': 'padding: calc(var(--space-1) * 1.25) calc(var(--space-1) * 2.75);',
  'margin-right: 0.4rem;': 'margin-right: calc(var(--space-1) * 1.6);',
  'height: 6px;': 'height: calc(var(--space-1) * 1.5);',
  'width: 14px;': 'width: calc(var(--space-1) * 3.5);',
  'height: 14px;': 'height: calc(var(--space-1) * 3.5);',
  'width: 18px;': 'width: calc(var(--space-1) * 4.5);',
  'height: 18px;': 'height: calc(var(--space-1) * 4.5);',
  'width: 44px;': 'width: calc(var(--space-1) * 11);',
  'height: 44px;': 'height: calc(var(--space-1) * 11);',
  'height: 120px;': 'height: var(--space-24);',
  'max-width: 800px;': 'max-width: var(--container-max);', // or a custom size
  'max-width: 600px;': 'max-width: calc(var(--container-max) / 2);',

  // Transitions
  'transition: color 0.2s;': 'transition: color var(--transition-fast);',
  'transition: transform 0.2s ease;': 'transition: transform var(--transition-fast);',
  'transition: color 0.3s ease;': 'transition: color var(--transition-base);',
  'transition: background 0.3s;': 'transition: background var(--transition-base);',
  'transition: background 0.2s ease;': 'transition: background var(--transition-fast);',
  'transition: transform 0.3s ease;': 'transition: transform var(--transition-base);',
  'transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1);': 'transition: transform var(--transition-base), box-shadow var(--transition-base);',
  'transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.4s cubic-bezier(0.4, 0, 0.2, 1);': 'transition: transform var(--transition-slow), box-shadow var(--transition-slow);',

  // Typography
  'font-size: 1.05rem;': 'font-size: var(--text-base);',
  'font-size: 0.95rem;': 'font-size: var(--text-base);',
  'font-size: 0.9rem;': 'font-size: var(--text-sm);',
  'font-size: 0.72rem;': 'font-size: var(--text-xs);',
  'font-size: 0.6rem;': 'font-size: var(--text-xs);',
  'font-size: 0.65rem;': 'font-size: var(--text-xs);',
  'font-size: 1.1rem;': 'font-size: var(--text-lg);',
  'font-size: 1.375rem;': 'font-size: var(--text-xl);',
  'font-size: 15px;': 'font-size: var(--text-base);',
  'line-height: 1.35;': 'line-height: var(--leading-snug);',
  'line-height: 1.25;': 'line-height: var(--leading-tight);',

  // Spacing offsets
  'margin-top: 0.375rem;': 'margin-top: calc(var(--space-1) * 1.5);',

  // Border radius
  'border-radius: 2px;': 'border-radius: var(--radius-xs);',

  // Fonts and Families
  'font-family: "SF Mono", "Cascadia Code", "Consolas", monospace;': 'font-family: var(--font-mono);',
  'font-family: Georgia, "Times New Roman", serif;': 'font-family: var(--font-serif);',
  'font-family: \'Work Sans\', system-ui, -apple-system, sans-serif;': 'font-family: var(--font-sans);',

  // Font sizes and line heights
  'font-size: 10px;': 'font-size: var(--text-xs);',
  'font-size: 2rem;': 'font-size: var(--text-4xl);',
  'font-size: 0.95rem !important;': 'font-size: var(--text-base) !important;',
  'line-height: 1.55;': 'line-height: var(--leading-normal);',
  'font-size: 1.4rem;': 'font-size: var(--text-xl);',
  'font-size: 0.6875rem;': 'font-size: var(--text-xs);',
  'font-size: 0.9em;': 'font-size: var(--text-sm);',
  'line-height: 22px;': 'line-height: var(--leading-normal);',
  'font-size: 11px;': 'font-size: var(--text-xs);',
  'font-size: 0.75em;': 'font-size: var(--text-xs);',

  // Colors
  'color: #333333 !important;': 'color: var(--neutral-800) !important;',
  'background: linear-gradient(135deg, #ff3366, #ff6b35);': 'background: var(--brand-gradient);',
  'border-color: #6b8f71;': 'border-color: var(--brand-secondary);',
  'background: rgba(0, 0, 0, 0.05);': 'background: var(--bg-hover);',
  'background: #d1d5db;': 'background: var(--neutral-300);',
  'background: #9ca3af;': 'background: var(--neutral-400);',
  'background: #f3f4f6;': 'background: var(--neutral-100);',
  'color: #d1d5db;': 'color: var(--neutral-300);',
  'color: #f3f4f6;': 'color: var(--neutral-100);',
  'color: #c2410c;': 'color: var(--brand-primary);',
  'background-color: #fff7ed;': 'background-color: var(--brand-primary-light);',
  'background: #2c1e16;': 'background: var(--bg-inset);',
  'background: linear-gradient( 45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100% );': 'background: var(--brand-gradient);',

  // Spacings
  'gap: 0.125rem;': 'gap: calc(var(--space-1) * 0.5);',
  'gap: 0.35rem;': 'gap: calc(var(--space-1) * 1.4);',
  'gap: 14px;': 'gap: calc(var(--space-1) * 3.5);',
  'padding: 3px;': 'padding: var(--space-1);',
  'padding: 0.625rem 0;': 'padding: calc(var(--space-1) * 2.5) var(--space-0);',

  // Borders & Shadows
  'border: 1px solid #e5e7eb;': 'border: 1px solid var(--border);',
  'border: 1px solid #cbd5e1;': 'border: 1px solid var(--border);',
  'border-color: rgba(255, 255, 255, 0.1);': 'border-color: var(--border-glass);',
  'border-bottom-color: rgba(255, 255, 255, 0.05);': 'border-bottom-color: var(--border-glass);',
  'border-top-color: rgba(255, 255, 255, 0.1);': 'border-top-color: var(--border-glass);',
  'box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);': 'box-shadow: var(--shadow-sm);',
  'box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);': 'box-shadow: var(--shadow-sm);',

  // Overlays & Backgrounds
  'background: rgba(255, 255, 255, 0.05);': 'background: var(--bg-hover);',
  'background-color: rgba(255, 255, 255, 0.05);': 'background-color: var(--bg-hover);',
  'background: rgba(255, 255, 255, 0.1);': 'background: var(--bg-active);',
  'background: rgba(255, 255, 255, 0.2);': 'background: var(--bg-active);',
  'background: rgba(255, 255, 255, 0.25);': 'background: var(--bg-active);',
  'background: rgba(255, 255, 255, 0.4);': 'background: var(--bg-active);',
  'background: #4b5563;': 'background: var(--neutral-600);',
  'background: #2c1e16;': 'background: var(--bg-inset);',
  'background: linear-gradient(145deg, #2c1e16, #3d2a1e);': 'background: var(--bg-inset);',
  'background: linear-gradient(145deg, #f9fafb, #e5e7eb);': 'background: var(--bg-alt);',
  'background: #000;': 'background: var(--bg-inset);',

  // Extra Transitions
  'transition: background 0.15s ease;': 'transition: background var(--transition-fast);',
  'transition: background-color 0.25s cubic-bezier(0.4, 0, 0.2, 1), color 0.25s cubic-bezier(0.4, 0, 0.2, 1), transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.25s cubic-bezier(0.4, 0, 0.2, 1);': 'transition: background-color var(--transition-base), color var(--transition-base), transform var(--transition-base), box-shadow var(--transition-base);',

  // Giant fonts
  'font-size: 4rem;': 'font-size: var(--text-5xl);',
};

// Regex replacements for common patterns
const regexReplacements = [
  { pattern: /font-size\s*:\s*0?\.875rem\s*(;?)/gi, replacement: 'font-size: var(--text-sm)$1' },
  { pattern: /font-size\s*:\s*1rem\s*(;?)/gi, replacement: 'font-size: var(--text-base)$1' },
  { pattern: /font-size\s*:\s*1\.125rem\s*(;?)/gi, replacement: 'font-size: var(--text-lg)$1' },
  { pattern: /font-size\s*:\s*1\.25rem\s*(;?)/gi, replacement: 'font-size: var(--text-xl)$1' },
  { pattern: /font-size\s*:\s*1\.5rem\s*(;?)/gi, replacement: 'font-size: var(--text-2xl)$1' },
  { pattern: /font-size\s*:\s*1\.875rem\s*(;?)/gi, replacement: 'font-size: var(--text-3xl)$1' },
  { pattern: /font-size\s*:\s*2\.25rem\s*(;?)/gi, replacement: 'font-size: var(--text-4xl)$1' },
  { pattern: /font-size\s*:\s*3rem\s*(;?)/gi, replacement: 'font-size: var(--text-5xl)$1' },
  { pattern: /font-size\s*:\s*0?\.75rem\s*(;?)/gi, replacement: 'font-size: var(--text-xs)$1' },
  { pattern: /transition\s*:\s*([^;]+)\s*0\.2s\s*ease\s*(;?)/gi, replacement: 'transition: $1 var(--transition-fast)$2' },
  { pattern: /transition\s*:\s*([^;]+)\s*0\.3s\s*ease\s*(;?)/gi, replacement: 'transition: $1 var(--transition-base)$2' },
  { pattern: /transition\s*:\s*([^;]+)\s*0\.5s\s*ease\s*(;?)/gi, replacement: 'transition: $1 var(--transition-slow)$2' }
];

let totalFixed = 0;
let totalSkipped = 0;

report.forEach(f => {
  const filePath = path.join(process.cwd(), f.file);
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${f.file}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf-8');
  let fileChanged = false;

  // 1. Process Regex Replacements inside style blocks
  content = content.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, (match, styleContent) => {
    let updatedStyle = styleContent;
    let styleChanged = false;
    regexReplacements.forEach(r => {
      // Reset regex index for safety
      r.pattern.lastIndex = 0;
      if (r.pattern.test(updatedStyle)) {
        updatedStyle = updatedStyle.replace(r.pattern, r.replacement);
        styleChanged = true;
        totalFixed++;
      }
    });
    if (styleChanged) {
      fileChanged = true;
      return match.replace(styleContent, updatedStyle);
    }
    return match;
  });

  // 2. Process Style Blocks with exact mappings
  f.styleBlocks.forEach(issue => {
    const origText = issue.text;
    const replacement = replacementMap[origText];
    if (replacement) {
      if (content.includes(origText)) {
        content = content.replace(new RegExp(escapeRegExp(origText), 'g'), replacement);
        fileChanged = true;
        totalFixed++;
      } else {
        // Try searching without trailing semicolon or with spacing variations
        const normalizedOrig = origText.replace(/\s+/g, ' ').trim();
        // Simple search and replace for normalized versions if possible
        // (we just check standard variations in file content)
        const possibleMatches = [
          origText,
          origText.replace(';$', ''),
          origText.replace(';$', ' !important;'),
        ];
        let matched = false;
        for (const m of possibleMatches) {
          if (content.includes(m)) {
            content = content.replace(m, replacement);
            fileChanged = true;
            totalFixed++;
            matched = true;
            break;
          }
        }
        if (!matched) {
          console.log(`[Skipped/Not Found in File] ${f.file}: "${origText}"`);
          totalSkipped++;
        }
      }
    } else {
      console.log(`[No Mapping] ${f.file}: "${origText}"`);
      totalSkipped++;
    }
  });

  // Process Tailwind Arbitrary classes if we can map them
  f.tailwindArbitrary.forEach(issue => {
    if (issue.text === 'min-h-[60vh]') {
      // replace with inline style token or something
      // or we can just leave it if it's layout, but let's see if it's easy to replace
      console.log(`[Tailwind Arbitrary] ${f.file}: ${issue.text}`);
      totalSkipped++;
    } else {
      console.log(`[Tailwind Arbitrary] ${f.file}: ${issue.text}`);
      totalSkipped++;
    }
  });

  if (fileChanged) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`[Updated] ${f.file}`);
  }
});

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

console.log(`\nRefactoring completed. Fixed: ${totalFixed}, Skipped/No Map: ${totalSkipped}`);
