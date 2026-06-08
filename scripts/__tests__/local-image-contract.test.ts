import { beforeAll, describe, expect, it } from 'vitest';

let buildMigrationPlan: typeof import('../local-image-contract.mjs').buildMigrationPlan;
let migrateImagesJsonText: typeof import('../local-image-contract.mjs').migrateImagesJsonText;
let migrateMediaVariantsJsonText: typeof import('../local-image-contract.mjs').migrateMediaVariantsJsonText;

beforeAll(async () => {
  const module = await import('../local-image-contract.mjs');
  buildMigrationPlan = module.buildMigrationPlan;
  migrateImagesJsonText = module.migrateImagesJsonText;
  migrateMediaVariantsJsonText = module.migrateMediaVariantsJsonText;
});

const mediaVariantsJson = JSON.stringify({
  variants: {
    xs: { r2_key: 'media/image-xs.webp', width: 360, height: 240, sizeBytes: 101, url: '/api/images/media/image-xs.webp' },
    sm: { r2_key: 'media/image-sm.webp', width: 720, height: 480, sizeBytes: 202, url: '/api/images/media/image-sm.webp' },
    md: { r2_key: 'media/image-md.webp', width: 1200, height: 800, sizeBytes: 303, url: '/api/images/media/image-md.webp' },
    lg: { r2_key: 'media/image-lg.webp', width: 2048, height: 1365, sizeBytes: 404, url: '/api/images/media/image-lg.webp' },
    original: { r2_key: 'media/image-original.jpg', width: 3000, height: 2000, sizeBytes: 505, url: '/api/images/media/image-original.jpg' },
  },
  placeholder: 'data:image/webp;base64,abc',
});

describe('local image contract migration helpers', () => {
  it('migrates media.variants_json to snake_case storage without public urls', () => {
    const migration = migrateMediaVariantsJsonText(mediaVariantsJson);

    expect(migration.changed).toBe(true);
    expect(migration.value).toBe(JSON.stringify({
      variants: {
        xs: { r2_key: 'media/image-xs.webp', width: 360, height: 240, size_bytes: 101 },
        sm: { r2_key: 'media/image-sm.webp', width: 720, height: 480, size_bytes: 202 },
        md: { r2_key: 'media/image-md.webp', width: 1200, height: 800, size_bytes: 303 },
        lg: { r2_key: 'media/image-lg.webp', width: 2048, height: 1365, size_bytes: 404 },
        original: { r2_key: 'media/image-original.jpg', width: 3000, height: 2000, size_bytes: 505 },
      },
      placeholder: 'data:image/webp;base64,abc',
    }));

    const second = migrateMediaVariantsJsonText(migration.value);
    expect(second.changed).toBe(false);
    expect(second.value).toBe(migration.value);
  });

  it('repairs local rows damaged by command-line quoting before file-based apply', () => {
    const damaged = '{variants:{xs:{r2_key:media/image-xs.webp,width:360,height:240,size_bytes:101},sm:{r2_key:media/image-sm.webp,width:720,height:480,size_bytes:202},md:{r2_key:media/image-md.webp,width:1200,height:800,size_bytes:303},lg:{r2_key:media/image-lg.webp,width:2048,height:1365,size_bytes:404},original:{r2_key:media/image-original.jpg,width:3000,height:2000,size_bytes:505}},placeholder:data:image/webp;base64,abc}';

    const migration = migrateMediaVariantsJsonText(damaged);

    expect(migration.changed).toBe(true);
    expect(JSON.parse(migration.value)).toEqual({
      variants: {
        xs: { r2_key: 'media/image-xs.webp', width: 360, height: 240, size_bytes: 101 },
        sm: { r2_key: 'media/image-sm.webp', width: 720, height: 480, size_bytes: 202 },
        md: { r2_key: 'media/image-md.webp', width: 1200, height: 800, size_bytes: 303 },
        lg: { r2_key: 'media/image-lg.webp', width: 2048, height: 1365, size_bytes: 404 },
        original: { r2_key: 'media/image-original.jpg', width: 3000, height: 2000, size_bytes: 505 },
      },
      placeholder: 'data:image/webp;base64,abc',
    });
  });

  it('migrates image snapshots to canonical slots idempotently', () => {
    const migration = migrateImagesJsonText('category', JSON.stringify({
      hero: {
        alt: 'Category hero',
        variants: {
          sm: { r2_key: 'media/hero-sm.webp', url: '/api/images/media/hero-sm.webp', width: 720, height: 480, sizeBytes: 202 },
          md: { r2_key: 'media/hero-md.webp', url: '/api/images/media/hero-md.webp', width: 1200, height: 800, sizeBytes: 303 },
        },
      },
      thumbnail: {
        alt: 'Category thumb',
        variants: {
          xs: { r2_key: 'media/thumb-xs.webp', width: 360, height: 240, sizeBytes: 101 },
          sm: { r2_key: 'media/thumb-sm.webp', width: 720, height: 480, sizeBytes: 202 },
        },
      },
    }));

    expect(migration.changed).toBe(true);
    expect(JSON.parse(migration.value)).toEqual({
      hero: {
        alt: 'Category hero',
        variants: {
          sm: { r2_key: 'media/hero-sm.webp', width: 720, height: 480, size_bytes: 202 },
          md: { r2_key: 'media/hero-md.webp', width: 1200, height: 800, size_bytes: 303 },
        },
      },
      thumbnail: {
        alt: 'Category thumb',
        variants: {
          xs: { r2_key: 'media/thumb-xs.webp', width: 360, height: 240, size_bytes: 101 },
          sm: { r2_key: 'media/thumb-sm.webp', width: 720, height: 480, size_bytes: 202 },
        },
      },
    });

    const second = migrateImagesJsonText('category', migration.value);
    expect(second.changed).toBe(false);
  });

  it('builds a dry-run/apply plan without mutating already canonical rows', () => {
    const rows = [
      { id: 1, json: mediaVariantsJson },
      { id: 2, json: migrateMediaVariantsJsonText(mediaVariantsJson).value },
    ];

    const plan = buildMigrationPlan(rows, migrateMediaVariantsJsonText);

    expect(plan.changed).toHaveLength(1);
    expect(plan.unchanged).toHaveLength(1);
    expect(rows[0].json).toBe(mediaVariantsJson);

    const afterApply = rows.map((row) => {
      const changed = plan.changed.find((item) => item.id === row.id);
      return changed ? { ...row, json: changed.value } : row;
    });
    const secondPlan = buildMigrationPlan(afterApply, migrateMediaVariantsJsonText);
    expect(secondPlan.changed).toHaveLength(0);
  });
});
