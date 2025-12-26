/**
 * Retry Utility with Exponential Backoff
 * 
 * Wraps async functions to automatically retry on failure.
 */

/**
 * Execute a function with automatic retries and exponential backoff.
 * 
 * @param {() => Promise<T>} fn - Async function to execute
 * @param {Object} options - Retry options
 * @param {number} [options.maxRetries=3] - Maximum number of retry attempts
 * @param {number} [options.baseDelay=1000] - Base delay in ms (doubles each retry)
 * @param {(error: Error, attempt: number) => boolean} [options.shouldRetry] - Custom retry condition
 * @returns {Promise<T>} - Result of the function
 * @throws {Error} - Throws after all retries exhausted
 * 
 * @example
 * const result = await withRetry(
 *   () => fetch('/api/upload'),
 *   { maxRetries: 3, baseDelay: 1000 }
 * );
 */
export async function withRetry(fn, options = {}) {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    shouldRetry = () => true,
  } = options;

  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if we should retry
      if (attempt >= maxRetries || !shouldRetry(error, attempt)) {
        throw error;
      }

      // Calculate delay with exponential backoff + jitter
      const delay = baseDelay * Math.pow(2, attempt);
      const jitter = Math.random() * 100; // Add up to 100ms jitter
      
      console.warn(
        `Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms:`,
        error.message
      );

      await new Promise(resolve => setTimeout(resolve, delay + jitter));
    }
  }

  throw lastError;
}

/**
 * Check if an error is retryable (network errors, timeouts, 5xx responses).
 * 
 * @param {Error} error - The error to check
 * @returns {boolean} - True if the error is likely transient
 */
export function isRetryableError(error) {
  // Network errors
  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    return true;
  }

  // Timeout errors
  if (error.name === 'AbortError' || error.message.includes('timeout')) {
    return true;
  }

  // HTTP 5xx errors (server errors)
  if (error.status >= 500 && error.status < 600) {
    return true;
  }

  // HTTP 429 (rate limited)
  if (error.status === 429) {
    return true;
  }

  // Connection errors
  if (error.message.includes('network') || error.message.includes('connection')) {
    return true;
  }

  return false;
}
