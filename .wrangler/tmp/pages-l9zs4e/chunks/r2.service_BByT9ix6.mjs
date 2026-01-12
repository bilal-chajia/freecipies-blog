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

async function uploadImage(bucket, options, publicUrl) {
  const { file, filename, contentType, metadata, folder, contextSlug } = options;
  const timestamp = Date.now();
  let key;
  if (folder && contextSlug) {
    const cleanSlug = contextSlug.replace(/[^a-z0-9-]/gi, "-").toLowerCase();
    const ext = filename.split(".").pop() || "webp";
    key = `${folder}/${cleanSlug}-${timestamp}.${ext}`;
  } else if (folder) {
    key = `${folder}/${timestamp}-${filename}`;
  } else {
    key = `${timestamp}-${filename}`;
  }
  const arrayBuffer = await file.arrayBuffer();
  await bucket.put(key, arrayBuffer, {
    httpMetadata: {
      contentType: contentType || file.type || "image/jpeg"
    },
    customMetadata: {
      originalFilename: filename,
      uploadedAt: (/* @__PURE__ */ new Date()).toISOString(),
      ...metadata
    }
  });
  return {
    success: true,
    key,
    url: `${publicUrl}/${key}`,
    filename,
    size: arrayBuffer.byteLength,
    contentType: contentType || file.type || "image/jpeg"
  };
}
async function getImage(bucket, key) {
  const object = await bucket.get(key);
  return object;
}
async function deleteImage(bucket, key) {
  try {
    await bucket.delete(key);
    return true;
  } catch (error) {
    console.error("Error deleting image:", error);
    return false;
  }
}

export { deleteImage as d, getImage as g, uploadImage as u };
