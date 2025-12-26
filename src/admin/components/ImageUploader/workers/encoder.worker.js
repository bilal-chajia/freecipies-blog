const encodeWebp = async (imageData, quality) => {
  const { encode } = await import('@jsquash/webp');
  const buffer = await encode(imageData, { quality });
  return new Blob([buffer], { type: 'image/webp' });
};

const encodeAvif = async (imageData, quality) => {
  const { encode } = await import('@jsquash/avif');
  const buffer = await encode(imageData, { quality });
  return new Blob([buffer], { type: 'image/avif' });
};

self.onmessage = async (event) => {
  const { id, payload } = event.data || {};
  if (!id || !payload) return;

  const { buffer, width, height, format, quality } = payload;

  try {
    const imageData = new ImageData(new Uint8ClampedArray(buffer), width, height);
    let outputFormat = format === 'avif' ? 'avif' : 'webp';
    let blob;

    if (outputFormat === 'avif') {
      try {
        blob = await encodeAvif(imageData, quality);
      } catch (err) {
        outputFormat = 'webp';
        blob = await encodeWebp(imageData, quality);
      }
    } else {
      blob = await encodeWebp(imageData, quality);
    }

    self.postMessage({ id, success: true, blob, outputFormat });
  } catch (err) {
    self.postMessage({
      id,
      success: false,
      error: err?.message || 'Encoding failed',
    });
  }
};
