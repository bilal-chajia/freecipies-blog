/**
 * Request/Response Logging Middleware
 * Provides structured logging for API requests and responses
 */

export interface RequestLog {
  timestamp: string;
  method: string;
  path: string;
  queryParams?: Record<string, string>;
  headers?: Record<string, string>;
  duration?: number;
  statusCode?: number;
  error?: string;
}

export interface LoggerConfig {
  enableConsole?: boolean;
  enableFile?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  maskSensitiveData?: boolean;
}

const DEFAULT_CONFIG: LoggerConfig = {
  enableConsole: true,
  enableFile: false,
  logLevel: 'info',
  maskSensitiveData: true,
};

const SENSITIVE_KEYS = ['password', 'token', 'authorization', 'api_key', 'secret'];

/**
 * Mask sensitive data in headers and query parameters
 */
function maskSensitiveData(obj: Record<string, any>): Record<string, any> {
  const masked = { ...obj };
  
  for (const key of SENSITIVE_KEYS) {
    if (key in masked) {
      masked[key] = '***MASKED***';
    }
  }
  
  return masked;
}

/**
 * Format log entry as JSON
 */
function formatLogEntry(log: RequestLog, config: LoggerConfig): string {
  const entry = {
    ...log,
    headers: config.maskSensitiveData ? maskSensitiveData(log.headers || {}) : log.headers,
    queryParams: config.maskSensitiveData ? maskSensitiveData(log.queryParams || {}) : log.queryParams,
  };
  
  return JSON.stringify(entry);
}

/**
 * Log request/response
 */
export function logRequest(log: RequestLog, config: LoggerConfig = DEFAULT_CONFIG): void {
  const logEntry = formatLogEntry(log, config);
  
  if (config.enableConsole) {
    const logFn = log.error ? console.error : console.log;
    logFn(`[${log.timestamp}] ${log.method} ${log.path} - ${log.statusCode || 'pending'}`, logEntry);
  }
}

/**
 * Create request logger middleware
 */
export function createRequestLogger(config: LoggerConfig = DEFAULT_CONFIG) {
  return async (request: Request): Promise<{ startTime: number; log: RequestLog }> => {
    const url = new URL(request.url);
    const startTime = Date.now();
    
    const log: RequestLog = {
      timestamp: new Date().toISOString(),
      method: request.method,
      path: url.pathname,
      queryParams: Object.fromEntries(url.searchParams),
      headers: Object.fromEntries(request.headers),
    };
    
    return { startTime, log };
  };
}

/**
 * Log response with duration
 */
export function logResponse(
  log: RequestLog,
  startTime: number,
  statusCode: number,
  error?: Error,
  config: LoggerConfig = DEFAULT_CONFIG
): void {
  const duration = Date.now() - startTime;
  
  const responseLog: RequestLog = {
    ...log,
    duration,
    statusCode,
    error: error?.message,
  };
  
  logRequest(responseLog, config);
}

/**
 * Performance metrics logger
 */
export interface PerformanceMetrics {
  endpoint: string;
  method: string;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  requestCount: number;
  errorCount: number;
}

export class PerformanceLogger {
  private metrics: Map<string, PerformanceMetrics> = new Map();
  
  recordRequest(
    endpoint: string,
    method: string,
    duration: number,
    hasError: boolean = false
  ): void {
    const key = `${method} ${endpoint}`;
    const existing = this.metrics.get(key);
    
    if (existing) {
      existing.avgDuration = (existing.avgDuration * existing.requestCount + duration) / (existing.requestCount + 1);
      existing.minDuration = Math.min(existing.minDuration, duration);
      existing.maxDuration = Math.max(existing.maxDuration, duration);
      existing.requestCount++;
      if (hasError) existing.errorCount++;
    } else {
      this.metrics.set(key, {
        endpoint,
        method,
        avgDuration: duration,
        minDuration: duration,
        maxDuration: duration,
        requestCount: 1,
        errorCount: hasError ? 1 : 0,
      });
    }
  }
  
  getMetrics(endpoint?: string): PerformanceMetrics[] {
    if (endpoint) {
      return Array.from(this.metrics.values()).filter(m => m.endpoint === endpoint);
    }
    return Array.from(this.metrics.values());
  }
  
  reset(): void {
    this.metrics.clear();
  }
}
