/**
 * Migrate local R2 images to Cloudflare R2
 * 
 * This script:
 * 1. Queries local D1 for all media records with localhost URLs
 * 2. Downloads images from local dev server
 * 3. Uploads to remote R2 bucket  
 * 4. Updates media table with production URLs
 * 
 * Usage: node scripts/migrate-r2-images.js
 * 
 * NOTE: Local dev server must be running (pnpm dev) to fetch images
 */

import { writeFileSync, unlinkSync } from 'fs';
import { execSync } from 'child_process';
import initSqlJs from 'sql.js';
import { readFileSync, statSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';

const R2_BUCKET = 'saas-blog-images';
const PUBLIC_R2_URL = 'https://pub-8c953b641d9c4b61a94975008940914d.r2.dev';
const LOCAL_DEV_URL = 'http://localhost:4321';

async function migrateR2Images() {
  console.log('🚀 Starting R2 image migration...\n');

  // 1. Find local database to get media records
  const dbDir = '.wrangler/state/v3/d1/miniflare-D1DatabaseObject';

  if (!existsSync(dbDir)) {
    console.error('❌ Local database directory not found');
    process.exit(1);
  }

  const dbFiles = readdirSync(dbDir).filter(f => f.endsWith('.sqlite'));

  if (dbFiles.length === 0) {
    console.error('❌ No local SQLite database found');
    process.exit(1);
  }

  const localDbFile = dbFiles.reduce((a, b) => {
    return statSync(join(dbDir, a)).size > statSync(join(dbDir, b)).size ? a : b;
  });

  const localDbPath = join(dbDir, localDbFile);
  console.log(`📂 Found local database: ${localDbFile}`);

  // 2. Read media records from local DB
  const SQL = await initSqlJs();
  const buffer = readFileSync(localDbPath);
  const db = new SQL.Database(new Uint8Array(buffer));

  try {
    const mediaResult = db.exec("SELECT id, name, variants_json FROM media WHERE variants_json LIKE '%localhost%'");

    if (mediaResult.length === 0 || mediaResult[0].values.length === 0) {
      console.log('✅ No local images with localhost URLs found. Nothing to migrate.');
      return;
    }

    const mediaRecords = mediaResult[0].values.map(([id, name, variants_json]) => ({
      id,
      name,
      variants: JSON.parse(variants_json)
    }));

    console.log(`📋 Found ${mediaRecords.length} media records with local URLs\n`);

    // 3. Extract all unique R2 keys
    const imagesToUpload = [];

    for (const record of mediaRecords) {
      for (const [variantName, variant] of Object.entries(record.variants.variants || {})) {
        if (variant.r2_key && !imagesToUpload.find(img => img.key === variant.r2_key)) {
          imagesToUpload.push({
            key: variant.r2_key,
            url: variant.url,
            variantName,
            mediaId: record.id,
            mediaName: record.name,
            data: null
          });
        }
      }
    }

    console.log(`📦 Found ${imagesToUpload.length} unique image variants to upload\n`);

    // 4. Download images from local dev server
    console.log('⏳ Downloading images from local dev server...');
    console.log('(Make sure "pnpm dev" is running on port 4321)\n');

    let downloaded = 0;
    let failed = 0;

    for (const image of imagesToUpload) {
      try {
        // Fix the URL - it already contains full localhost URL
        const url = image.url.startsWith('http')
          ? image.url
          : `${LOCAL_DEV_URL}/images/${image.key}`;

        console.log(`  Downloading: ${image.key}`);

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        image.data = Buffer.from(await response.arrayBuffer());
        console.log(`    ✓ ${Math.round(image.data.length / 1024)} KB`);
        downloaded++;
      } catch (error) {
        console.error(`    ✗ Failed: ${error.message}`);
        failed++;
        image.data = null;
      }
    }

    console.log(`\n📥 Downloaded: ${downloaded} succeeded, ${failed} failed\n`);

    // 5. Upload to remote R2
    console.log('⏳ Uploading images to remote R2...\n');

    let uploaded = 0;
    let uploadFailed = 0;
    const uploadedKeys = [];

    for (const image of imagesToUpload) {
      if (!image.data) {
        console.log(`  ⊘ Skipping ${image.key} (not downloaded)`);
        continue;
      }

      try {
        const cleanKey = image.key.replace(/^\//, '');
        const tempFile = `temp-r2-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.bin`;

        writeFileSync(tempFile, image.data);

        console.log(`  Uploading: ${cleanKey}`);
        execSync(
          `npx wrangler r2 object put ${R2_BUCKET}/${cleanKey} --file=${tempFile}`,
          { stdio: 'pipe', encoding: 'utf8', timeout: 30000 }
        );

        uploadedKeys.push(cleanKey);
        uploaded++;

        try { unlinkSync(tempFile); } catch { }
      } catch (error) {
        console.error(`  ❌ Failed: ${error.message}`);
        uploadFailed++;
        try { unlinkSync(`temp-r2-*`); } catch { }
      }
    }

    console.log(`\n📤 Uploaded: ${uploaded} succeeded, ${uploadFailed} failed\n`);

    // 6. Update media table with production URLs
    if (uploadedKeys.length > 0) {
      console.log('🔄 Updating media URLs to production R2 URLs...');

      const updateStatements = [];

      for (const record of mediaRecords) {
        let updated = false;

        for (const [variantName, variant] of Object.entries(record.variants.variants || {})) {
          if (variant.r2_key && uploadedKeys.includes(variant.r2_key.replace(/^\//, ''))) {
            variant.url = `${PUBLIC_R2_URL}/${variant.r2_key.replace(/^\//, '')}`;
            updated = true;
          }
        }

        if (updated) {
          const escapedJson = JSON.stringify(record.variants).replace(/'/g, "''");
          updateStatements.push(
            `UPDATE media SET variants_json = '${escapedJson}' WHERE id = ${record.id};`
          );
        }
      }

      if (updateStatements.length > 0) {
        const updateSql = updateStatements.join('\n');
        const tempUpdateFile = 'temp-update-media.sql';
        writeFileSync(tempUpdateFile, updateSql);

        console.log(`  Updating ${updateStatements.length} media records...`);
        try {
          execSync(
            `npx wrangler d1 execute freecipies-db --file=${tempUpdateFile} --remote --yes`,
            { stdio: 'pipe', encoding: 'utf8', timeout: 60000 }
          );

          console.log(`  ✅ Updated ${updateStatements.length} media records`);
        } catch (e) {
          console.error(`  ⚠️  Failed to update media URLs: ${e.message}`);
        }

        try { unlinkSync(tempUpdateFile); } catch { }
      }
    }

    console.log('\n✅ R2 migration complete!');
    console.log(`   - ${uploaded} images uploaded to R2`);
    console.log(`   - Remote R2 URL: ${PUBLIC_R2_URL}`);

  } finally {
    db.close();
  }
}

migrateR2Images().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
