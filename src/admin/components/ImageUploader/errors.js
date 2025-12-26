/**
 * Custom Error Types for Image Upload Module
 * 
 * Provides specific error types and user-friendly messages
 * for better UX and debugging.
 */

/**
 * Error types for categorizing upload failures
 */
export const ERROR_TYPES = {
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FORMAT: 'INVALID_FORMAT',
  NETWORK_ERROR: 'NETWORK_ERROR',
  ENCODING_FAILED: 'ENCODING_FAILED',
  UPLOAD_FAILED: 'UPLOAD_FAILED',
  CONFIRM_FAILED: 'CONFIRM_FAILED',
  CROP_FAILED: 'CROP_FAILED',
  TIMEOUT: 'TIMEOUT',
  UNKNOWN: 'UNKNOWN',
};

/**
 * User-friendly error messages
 */
export const ERROR_MESSAGES = {
  [ERROR_TYPES.FILE_TOO_LARGE]: {
    title: 'File too large',
    description: 'Please select an image smaller than 50MB.',
  },
  [ERROR_TYPES.INVALID_FORMAT]: {
    title: 'Invalid file format',
    description: 'Please upload a JPEG, PNG, WebP, or GIF image.',
  },
  [ERROR_TYPES.NETWORK_ERROR]: {
    title: 'Connection problem',
    description: 'Check your internet connection and try again.',
  },
  [ERROR_TYPES.ENCODING_FAILED]: {
    title: 'Processing error',
    description: 'Failed to process the image. Try a different file.',
  },
  [ERROR_TYPES.UPLOAD_FAILED]: {
    title: 'Upload failed',
    description: 'Could not upload the image. Please try again.',
  },
  [ERROR_TYPES.CONFIRM_FAILED]: {
    title: 'Save failed',
    description: 'The image was uploaded but could not be saved. Please try again.',
  },
  [ERROR_TYPES.CROP_FAILED]: {
    title: 'Crop failed',
    description: 'Could not crop the image. Try adjusting the crop area.',
  },
  [ERROR_TYPES.TIMEOUT]: {
    title: 'Request timed out',
    description: 'The upload took too long. Please try again with a smaller file.',
  },
  [ERROR_TYPES.UNKNOWN]: {
    title: 'Something went wrong',
    description: 'An unexpected error occurred. Please try again.',
  },
};

/**
 * Custom Upload Error class with user-friendly messaging
 */
export class UploadError extends Error {
  /**
   * @param {string} type - One of ERROR_TYPES
   * @param {string} technicalMessage - Detailed message for debugging
   * @param {Object} [options] - Additional options
   * @param {string} [options.userMessage] - Override the default user message
   * @param {Error} [options.cause] - Original error that caused this
   */
  constructor(type, technicalMessage, options = {}) {
    super(technicalMessage);
    this.name = 'UploadError';
    this.type = type;
    this.cause = options.cause;
    
    // Get user-friendly messages
    const defaultMessages = ERROR_MESSAGES[type] || ERROR_MESSAGES[ERROR_TYPES.UNKNOWN];
    this.userTitle = options.userTitle || defaultMessages.title;
    this.userMessage = options.userMessage || defaultMessages.description;
  }

  /**
   * Get a formatted object for displaying to users
   */
  toUserError() {
    return {
      type: this.type,
      title: this.userTitle,
      message: this.userMessage,
    };
  }
}

/**
 * Create an UploadError from a generic error
 * @param {Error} error - The original error
 * @returns {UploadError}
 */
export function fromError(error) {
  // Already an UploadError
  if (error instanceof UploadError) {
    return error;
  }

  // Detect error type from message/properties
  const message = error.message?.toLowerCase() || '';

  if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
    return new UploadError(ERROR_TYPES.NETWORK_ERROR, error.message, { cause: error });
  }

  if (message.includes('timeout') || error.name === 'AbortError') {
    return new UploadError(ERROR_TYPES.TIMEOUT, error.message, { cause: error });
  }

  if (message.includes('encoding') || message.includes('canvas') || message.includes('blob')) {
    return new UploadError(ERROR_TYPES.ENCODING_FAILED, error.message, { cause: error });
  }

  if (message.includes('crop') || message.includes('load image')) {
    return new UploadError(ERROR_TYPES.CROP_FAILED, error.message, { cause: error });
  }

  if (message.includes('upload') || message.includes('variant')) {
    return new UploadError(ERROR_TYPES.UPLOAD_FAILED, error.message, { cause: error });
  }

  if (message.includes('confirm') || message.includes('save')) {
    return new UploadError(ERROR_TYPES.CONFIRM_FAILED, error.message, { cause: error });
  }

  // Unknown error
  return new UploadError(ERROR_TYPES.UNKNOWN, error.message, { cause: error });
}

/**
 * Validate file before upload
 * @param {File} file - File to validate
 * @param {Object} constraints - Validation constraints
 * @returns {{ valid: boolean, error?: UploadError }}
 */
export function validateFile(file, constraints = {}) {
  const {
    maxSizeBytes = 50 * 1024 * 1024,
    supportedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  } = constraints;

  // Check file size
  if (file.size > maxSizeBytes) {
    const sizeMB = Math.round(maxSizeBytes / 1024 / 1024);
    return {
      valid: false,
      error: new UploadError(
        ERROR_TYPES.FILE_TOO_LARGE,
        `File size ${file.size} exceeds limit ${maxSizeBytes}`,
        { userMessage: `Please select an image smaller than ${sizeMB}MB.` }
      ),
    };
  }

  // Check file type
  if (!supportedTypes.includes(file.type)) {
    return {
      valid: false,
      error: new UploadError(
        ERROR_TYPES.INVALID_FORMAT,
        `File type ${file.type} not supported`,
        { userMessage: 'Please upload a JPEG, PNG, WebP, or GIF image.' }
      ),
    };
  }

  return { valid: true };
}
