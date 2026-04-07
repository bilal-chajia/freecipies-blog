/**
 * Migrate local SQLite database to Cloudflare D1
 * Uses sql.js to read local SQLite and generates SQL for D1
 * 
 * Usage: node scripts/migrate-local-to-d1.js
 */

import { existsSync, readdirSync, writeFileSync, unlinkSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import initSqlJs from 'sql.js';

async function migrate() {
  // Find the local database file
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

  // Use the largest database file (most likely the main one)
  const localDbFile = dbFiles.reduce((a, b) => {
    const statA = statSync(join(dbDir, a));
    const statB = statSync(join(dbDir, b));
    return statA.size > statB.size ? a : b;
  });

  const localDbPath = join(dbDir, localDbFile);
  console.log(`📂 Found local database: ${localDbPath}`);

  // Initialize sql.js
  const SQL = await initSqlJs();

  // Read the database file
  const buffer = readFileSync(localDbPath);
  const db = new SQL.Database(new Uint8Array(buffer));

  // Get all tables (excluding sqlite internal tables, fts5 virtual tables, and internal tracking tables)
  const tablesResult = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '%_fts%' AND name NOT LIKE 'idx_%' AND name != '_cf_METADATA'");

  if (tablesResult.length === 0 || tablesResult[0].values.length === 0) {
    console.log('⚠️  No tables found in local database');
    return;
  }

  const tables = tablesResult[0].values.map(row => row[0]);
  console.log(`📋 Found ${tables.length} tables: ${tables.join(', ')}`);

  // Export data from each table
  const insertStatements = [];

  for (const table of tables) {
    try {
      // Get all rows
      const result = db.exec(`SELECT * FROM ${table}`);

      if (result.length === 0 || result[0].values.length === 0) {
        console.log(`  ⊘ ${table}: 0 rows (skipping)`);
        continue;
      }

      const columns = result[0].columns;
      const rows = result[0].values;

      console.log(`  ✓ ${table}: ${rows.length} rows`);

      // Generate INSERT statements
      for (const row of rows) {
        const values = row.map(val => {
          if (val === null) return 'NULL';
          if (typeof val === 'number') return val.toString();
          if (typeof val === 'string') {
            // Escape single quotes and newlines
            return `'${val.replace(/'/g, "''").replace(/\n/g, '\\n').replace(/\r/g, '\\r')}'`;
          }
          return `'${String(val).replace(/'/g, "''")}'`;
        });

        const cols = columns.join(', ');
        const vals = values.join(', ');
        insertStatements.push(`INSERT OR REPLACE INTO ${table} (${cols}) VALUES (${vals});`);
      }
    } catch (error) {
      console.warn(`  ⚠️  Error reading ${table}: ${error.message}`);
    }
  }

  db.close();

  if (insertStatements.length === 0) {
    console.log('⚠️  No data found in local database. Nothing to migrate.');
    return;
  }

  // Write to temporary SQL file
  const tempSqlFile = 'temp-migrate-d1.sql';
  const sqlContent = insertStatements.join('\n');
  writeFileSync(tempSqlFile, sqlContent, 'utf8');

  console.log(`\n📝 Generated ${insertStatements.length} INSERT statements in ${tempSqlFile}`);
  console.log('\n⏳ Uploading to D1 database...');
  console.log('(This may take a moment)\n');

  try {
    // Execute the SQL file on D1
    execSync(
      `npx wrangler d1 execute freecipies-db --file=${tempSqlFile} --remote --yes`,
      { stdio: 'inherit', encoding: 'utf8', timeout: 300000 }
    );

    console.log('\n✅ Migration completed successfully!');

    // Clean up temp file
    unlinkSync(tempSqlFile);
    console.log('🧹 Cleaned up temporary SQL file');
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  }
}

migrate().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
