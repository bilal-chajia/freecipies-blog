type ImportWithRetryOptions = {
  retries?: number;
  delayMs?: number;
};

export async function importWithRetry<T>(
  factory: () => Promise<T>,
  options: ImportWithRetryOptions = {}
): Promise<T> {
  const retries = Number.isFinite(options.retries) ? options.retries as number : 2;
  const delayMs = Number.isFinite(options.delayMs) ? options.delayMs : 250;

  let lastError: unknown;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await factory();
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError;
}
