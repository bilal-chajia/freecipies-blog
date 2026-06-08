/**
 * Retry Utility with Exponential Backoff
 * 
 * Wraps async functions to automatically retry on failure.
 */

export interface RetryOptions {
    maxRetries?: number;
    baseDelay?: number;
    shouldRetry?: (error: Error, attempt: number) => boolean;
}

/**
 * Execute a function with automatic retries and exponential backoff.
 * 
 * @param fn - Async function to execute
 * @param options - Retry options
 * @returns Result of the function
 * @throws Error after all retries exhausted
 * 
 * @example
 * const result = await withRetry(
 *   () => fetch('/api/upload'),
 *   { maxRetries: 3, baseDelay: 1000 }
 * );
 */
export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    shouldRetry = () => true,
  } = options;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if we should retry
      if (attempt >= maxRetries || !shouldRetry(lastError, attempt)) {
        throw error;
      }

      // Calculate delay with exponential backoff + jitter
      const delay = baseDelay * Math.pow(2, attempt);
      const jitter = Math.random() * 100; // Add up to 100ms jitter
      
      console.warn(
        `Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms:`,
        lastError.message
      );

      await new Promise(resolve => setTimeout(resolve, delay + jitter));
    }
  }

  throw lastError;
}

interface RetryableError extends Error {
  status?: number;
}

/**
 * Check if an error is retryable (network errors, timeouts, 5xx responses).
 * 
 * @param error - The error to check
 * @returns True if the error is likely transient
 */
export function isRetryableError(error: RetryableError | unknown): boolean {
  const err = error instanceof Error ? error : new Error(String(error));

  // Network errors
  if (err.name === 'TypeError' && err.message.includes('fetch')) {
    return true;
  }

  // Timeout errors
  if (err.name === 'AbortError' || err.message.includes('timeout')) {
    return true;
  }

  const retryable = err as RetryableError;

  // HTTP 5xx errors (server errors)
  if (retryable.status !== undefined && retryable.status >= 500 && retryable.status < 600) {
    return true;
  }

  // HTTP 429 (rate limited)
  if (retryable.status === 429) {
    return true;
  }

  // Connection errors
  if (err.message.includes('network') || err.message.includes('connection')) {
    return true;
  }

  return false;
}
