interface WorkerPayload {
  buffer: ArrayBufferLike;
  width: number;
  height: number;
  format: string;
  quality: number;
}

interface WorkerRequest {
  id: string;
  payload: WorkerPayload;
}

interface WorkerSuccessResponse {
  id: string;
  success: true;
  blob: Blob;
  outputFormat: string;
}

interface WorkerErrorResponse {
  id: string;
  success: false;
  error: string;
}

type WorkerResponse = WorkerSuccessResponse | WorkerErrorResponse;

const encodeWebp = async (imageData: ImageData, quality: number): Promise<Blob> => {
  const { encode } = await import('@jsquash/webp');
  const buffer = await encode(imageData, { quality });
  return new Blob([buffer], { type: 'image/webp' });
};

const encodeAvif = async (imageData: ImageData, quality: number): Promise<Blob> => {
  const { encode } = await import('@jsquash/avif');
  const buffer = await encode(imageData, { quality });
  return new Blob([buffer], { type: 'image/avif' });
};

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const { id, payload } = event.data || {} as WorkerRequest;
  if (!id || !payload) return;

  const { buffer, width, height, format, quality } = payload;

  try {
    const imageData = new ImageData(new Uint8ClampedArray(buffer as ArrayBuffer), width, height);
    let outputFormat = format === 'avif' ? 'avif' : 'webp';
    let blob: Blob;

    if (outputFormat === 'avif') {
      try {
        blob = await encodeAvif(imageData, quality);
      } catch (_err) {
        outputFormat = 'webp';
        blob = await encodeWebp(imageData, quality);
      }
    } else {
      blob = await encodeWebp(imageData, quality);
    }

    self.postMessage({ id, success: true, blob, outputFormat } satisfies WorkerSuccessResponse);
  } catch (err: unknown) {
    self.postMessage({
      id,
      success: false,
      error: err instanceof Error ? err.message : 'Encoding failed',
    } satisfies WorkerErrorResponse);
  }
};
