/**
 * Build script for Cloudflare Pages deployment
 * - Runs Astro build with increased memory
 * - Removes ASSETS binding from wrangler.json (reserved by Pages)
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

console.log('🔨 Starting build...');

// Run Astro build with increased memory
try {
  execSync('pnpm exec astro build', {
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_OPTIONS: '--max-old-space-size=4096',
    },
  });
} catch (error) {
  console.error('❌ Astro build failed');
  process.exit(1);
}

// Fix wrangler.json - remove ASSETS binding (reserved by Cloudflare Pages)
const wranglerPath = join(process.cwd(), 'dist', 'server', 'wrangler.json');

if (existsSync(wranglerPath)) {
  console.log('🔧 Fixing wrangler.json for Cloudflare Pages...');
  
  try {
    const config = JSON.parse(readFileSync(wranglerPath, 'utf8'));
    
    // Remove assets binding (Pages provides this automatically)
    if (config.assets) {
      // delete config.assets; // COMMENTED OUT: We need this for local `pnpm preview`!
      console.log('  ✓ Skipped removing assets property to keep local preview working');
    }
    
    // Also filter from bindings array if present
    if (config.bindings) {
      const before = config.bindings.length;
      config.bindings = config.bindings.filter(b => b.name !== 'ASSETS');
      if (config.bindings.length < before) {
        console.log('  ✓ Filtered ASSETS from bindings array');
      }
    }
    
    writeFileSync(wranglerPath, JSON.stringify(config, null, 2));
    console.log('✅ wrangler.json fixed successfully');
  } catch (error) {
    console.error('⚠️  Failed to fix wrangler.json:', error.message);
    console.log('Continuing anyway...');
  }
} else {
  console.log('ℹ️  wrangler.json not found, skipping fix');
}

console.log('✅ Build complete!');
