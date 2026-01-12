if (typeof MessageChannel === 'undefined') {
  function MessagePort() {
    this.onmessage = null;
    this._target = null;
  }
  MessagePort.prototype.postMessage = function (data) {
    var handler = this._target && this._target.onmessage;
    if (typeof handler === 'function') {
      handler({ data: data });
    }
  };
  function MessageChannelPolyfill() {
    this.port1 = new MessagePort();
    this.port2 = new MessagePort();
    this.port1._target = this.port2;
    this.port2._target = this.port1;
  }
  globalThis.MessageChannel = MessageChannelPolyfill;
}

import { m as media } from './pinterest.schema_eG5oHE2g.mjs';
import { c as createDb, a as and, i as isNull, e as eq, o as or, l as like, b as asc, d as desc } from './drizzle_BakpoMbM.mjs';

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
async function hardDeleteMedia(db, id) {
  const drizzle = createDb(db);
  await drizzle.delete(media).where(eq(media.id, id));
  return true;
}

export { getMedia as a, createMedia as c, getMediaById as g, hardDeleteMedia as h, updateMedia as u };
