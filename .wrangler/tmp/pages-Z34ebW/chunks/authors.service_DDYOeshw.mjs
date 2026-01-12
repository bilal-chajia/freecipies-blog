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

import { b as authors } from './pinterest.schema_eG5oHE2g.mjs';
import { c as createDb, a as and, i as isNull, e as eq, b as asc } from './drizzle_BakpoMbM.mjs';

async function getAuthors(db, options) {
  const drizzle = createDb(db);
  const conditions = [isNull(authors.deletedAt)];
  if (options?.isOnline !== void 0) {
    conditions.push(eq(authors.isOnline, options.isOnline));
  }
  return await drizzle.select().from(authors).where(and(...conditions)).orderBy(asc(authors.sortOrder), asc(authors.name));
}
async function getAuthorBySlug(db, slug) {
  const drizzle = createDb(db);
  return await drizzle.query.authors.findFirst({
    where: and(eq(authors.slug, slug), isNull(authors.deletedAt))
  }) || null;
}
async function getAuthorById(db, id) {
  const drizzle = createDb(db);
  return await drizzle.query.authors.findFirst({
    where: and(eq(authors.id, id), isNull(authors.deletedAt))
  }) || null;
}
async function createAuthor(db, author) {
  const drizzle = createDb(db);
  const [inserted] = await drizzle.insert(authors).values(author).returning();
  return inserted || null;
}
async function updateAuthor(db, slug, author) {
  const drizzle = createDb(db);
  const updateData = {
    ...author,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  await drizzle.update(authors).set(updateData).where(eq(authors.slug, slug));
  return getAuthorBySlug(db, slug);
}
async function deleteAuthor(db, slug) {
  const drizzle = createDb(db);
  await drizzle.update(authors).set({ deletedAt: (/* @__PURE__ */ new Date()).toISOString() }).where(eq(authors.slug, slug));
  return true;
}
async function updateAuthorById(db, id, author) {
  const drizzle = createDb(db);
  const updateData = {
    ...author,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  await drizzle.update(authors).set(updateData).where(eq(authors.id, id));
  return getAuthorById(db, id);
}

export { getAuthors as a, getAuthorById as b, createAuthor as c, deleteAuthor as d, updateAuthorById as e, getAuthorBySlug as g, updateAuthor as u };
