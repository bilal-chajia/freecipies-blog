globalThis.process ??= {}; globalThis.process.env ??= {};
import { m as media } from './pinterest.schema_DDOHgYvi.mjs';
import { c as createDb, a as and, i as isNull, e as eq, o as or, l as like, b as asc, d as desc } from './drizzle_DoAA6T5m.mjs';

async function getMedia(db, options) {
  const drizzle = createDb(db);
  const conditions = [isNull(media.deletedAt)];
  if (options?.folder) {
    conditions.push(eq(media.folder, options.folder));
  }
  if (options?.search) {
    const searchPattern = `%${options.search}%`;
    conditions.push(
      or(
        like(media.name, searchPattern),
        like(media.altText, searchPattern)
      )
    );
  }
  const query = drizzle.select().from(media).where(and(...conditions)).orderBy(
    options?.order === "asc" ? asc(media.createdAt) : desc(media.createdAt)
  );
  if (options?.limit) {
    if (options?.offset) {
      return await query.limit(options.limit).offset(options.offset);
    }
    return await query.limit(options.limit);
  }
  return await query;
}
async function getMediaById(db, id) {
  const drizzle = createDb(db);
  return await drizzle.query.media.findFirst({
    where: and(eq(media.id, id), isNull(media.deletedAt))
  }) || null;
}
async function createMedia(db, data) {
  const drizzle = createDb(db);
  const [inserted] = await drizzle.insert(media).values(data).returning();
  return inserted || null;
}
async function updateMedia(db, id, data) {
  const drizzle = createDb(db);
  const updateData = { ...data };
  updateData.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  await drizzle.update(media).set(updateData).where(eq(media.id, id));
  return true;
}
async function deleteMedia(db, id) {
  const drizzle = createDb(db);
  await drizzle.update(media).set({ deletedAt: (/* @__PURE__ */ new Date()).toISOString() }).where(eq(media.id, id));
  return true;
}

export { getMedia as a, createMedia as c, deleteMedia as d, getMediaById as g, updateMedia as u };
