/**
 * Error types and utilities for ImageUploader
 */

export const ERROR_TYPES = {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    FILE_TOO_LARGE: 'FILE_TOO_LARGE',
    INVALID_TYPE: 'INVALID_TYPE',
    UPLOAD_FAILED: 'UPLOAD_FAILED',
    NETWORK_ERROR: 'NETWORK_ERROR',
    ENCODING_FAILED: 'ENCODING_FAILED',
    ABORTED: 'ABORTED',
} as const;

export type ErrorType = keyof typeof ERROR_TYPES;

export interface UploadErrorOptions {
    userMessage?: string;
    details?: Record<string, unknown>;
}

export class UploadError extends Error {
    type: ErrorType;
    userMessage: string;
    details?: Record<string, unknown>;

    constructor(type: ErrorType, message: string, options: UploadErrorOptions = {}) {
        super(message);
        this.name = 'UploadError';
        this.type = type;
        this.userMessage = options.userMessage || message;
        this.details = options.details;
    }
}

/**
 * Convert any error to UploadError
 */
export function fromError(error: unknown): UploadError {
    if (error instanceof UploadError) {
        return error;
    }

    if (error instanceof Error) {
        if (error.name === 'AbortError') {
            return new UploadError(ERROR_TYPES.ABORTED, 'Upload cancelled', {
                userMessage: 'Upload was cancelled',
            });
        }
        return new UploadError(ERROR_TYPES.UPLOAD_FAILED, error.message, {
            userMessage: 'An unexpected error occurred during upload',
        });
    }

    return new UploadError(ERROR_TYPES.UPLOAD_FAILED, String(error), {
        userMessage: 'An unexpected error occurred',
    });
}

export interface FileConstraints {
    maxSizeBytes: number;
    allowedTypes?: string[];
}

export interface ValidationResult {
    valid: boolean;
    error?: UploadError;
}

/**
 * Validate file before upload
 */
export function validateFile(
    file: File,
    constraints: FileConstraints
): ValidationResult {
    // Check file size
    if (file.size > constraints.maxSizeBytes) {
        const maxMB = Math.round(constraints.maxSizeBytes / 1024 / 1024);
        return {
            valid: false,
            error: new UploadError(ERROR_TYPES.FILE_TOO_LARGE, `File exceeds ${maxMB}MB limit`, {
                userMessage: `File is too large. Maximum size is ${maxMB}MB.`,
                details: { size: file.size, maxSize: constraints.maxSizeBytes },
            }),
        };
    }

    // Check file type
    const allowedTypes = constraints.allowedTypes || [
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
        'image/avif',
    ];

    if (!allowedTypes.includes(file.type)) {
        return {
            valid: false,
            error: new UploadError(ERROR_TYPES.INVALID_TYPE, `Unsupported file type: ${file.type}`, {
                userMessage: 'This file type is not supported. Please use JPG, PNG, WebP, or GIF.',
                details: { type: file.type, allowedTypes },
            }),
        };
    }

    return { valid: true };
}
