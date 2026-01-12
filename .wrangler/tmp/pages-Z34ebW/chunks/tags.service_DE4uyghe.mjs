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

import { t as tags } from './pinterest.schema_eG5oHE2g.mjs';
import { c as createDb, i as isNull, a as and, b as asc, e as eq } from './drizzle_BakpoMbM.mjs';

async function getTags(db, options) {
  const drizzle = createDb(db);
  const conditions = [isNull(tags.deletedAt)];
  if (options?.isOnline !== void 0) {
    conditions.push(eq(tags.isOnline, options.isOnline));
  }
  const query = drizzle.select().from(tags).where(and(...conditions)).orderBy(asc(tags.label));
  if (options?.limit) {
    return await query.limit(options.limit);
  }
  return await query;
}
async function getTagBySlug(db, slug) {
  const drizzle = createDb(db);
  return await drizzle.query.tags.findFirst({
    where: and(eq(tags.slug, slug), isNull(tags.deletedAt))
  }) || null;
}
async function createTag(db, tag) {
  const drizzle = createDb(db);
  const [inserted] = await drizzle.insert(tags).values(tag).returning();
  return inserted || null;
}
async function updateTag(db, slug, tag) {
  const drizzle = createDb(db);
  const updateData = {
    ...tag,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  await drizzle.update(tags).set(updateData).where(eq(tags.slug, slug));
  return getTagBySlug(db, slug);
}
async function deleteTag(db, slug) {
  const drizzle = createDb(db);
  await drizzle.update(tags).set({ deletedAt: (/* @__PURE__ */ new Date()).toISOString() }).where(eq(tags.slug, slug));
  return true;
}

export { getTagBySlug as a, createTag as c, deleteTag as d, getTags as g, updateTag as u };
