import * as Sentry from '@sentry/nextjs';
import { currentRequestLogContext } from '@/lib/observability/request-context';

/**
 * Centralized production-grade logger for the ModelOps backend.
 * Provides structured JSON logging in production and human-readable formatting in development.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class StructuredLogger {
  private redact(value: unknown): unknown {
    if (typeof value === 'string') {
      return value.replace(/(Bearer\s+|AIza[\w-]+|gsk_[\w-]+)/gi, '$1[REDACTED]');
    }
    if (Array.isArray(value)) return value.map((item) => this.redact(item));
    if (value && typeof value === 'object') {
      return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        /(authorization|api[_-]?key|secret|token|password)/i.test(key) ? '[REDACTED]' : this.redact(item),
      ]));
    }
    return value;
  }

  private sanitizeError(arg: unknown): unknown {
    if (arg instanceof Error) {
      return this.redact({ name: arg.name, message: arg.message, stack: arg.stack });
    }
    return this.redact(arg);
  }

  private log(level: LogLevel, message: string, args: unknown[]) {
    const isProd = process.env.NODE_ENV === 'production';
    const timestamp = new Date().toISOString();
    const request = currentRequestLogContext();
    const safeMessage = this.redact(message) as string;
    const context = args.length > 0 ? args.map((arg) => this.sanitizeError(arg)) : undefined;

    if (level === 'error' && (process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN)) {
      Sentry.withScope((scope) => {
        scope.setLevel('error');
        scope.setTag('log.origin', 'application');
        if (request) {
          scope.setTag('request.id', request.request_id);
          scope.setTag('http.route', request.route);
          scope.setTag('http.method', request.method);
        }
        const error = args.find((arg): arg is Error => arg instanceof Error);
        if (error) scope.setTag('error.type', error.name);
        // Capture the safe, static log message—not raw request data or an
        // upstream error body. beforeSend provides a second privacy boundary.
        Sentry.captureMessage(safeMessage, 'error');
      });
    }

    if (isProd) {
      // Structured JSON logging for production observability (e.g., Datadog, ELK)
      const logEntry = {
        timestamp,
        level,
        message: safeMessage,
        ...(request ? { request } : {}),
        ...(context ? { context } : {}),
      };
      
      const serialized = JSON.stringify(logEntry);
      if (level === 'error' || level === 'warn') {
        process.stderr.write(serialized + '\n');
      } else {
        process.stdout.write(serialized + '\n');
      }
    } else {
      // Human-readable formats for local development/testing
      const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
      switch (level) {
        case 'error':
          console.error(prefix, safeMessage, ...(context || []));
          break;
        case 'warn':
          console.warn(prefix, safeMessage, ...(context || []));
          break;
        case 'info':
          console.info(prefix, safeMessage, ...(context || []));
          break;
        case 'debug':
          console.debug(prefix, safeMessage, ...(context || []));
          break;
      }
    }
  }

  debug(message: string, ...args: unknown[]) { this.log('debug', message, args); }
  info(message: string, ...args: unknown[]) { this.log('info', message, args); }
  warn(message: string, ...args: unknown[]) { this.log('warn', message, args); }
  error(message: string, ...args: unknown[]) { this.log('error', message, args); }
}

export const logger = new StructuredLogger();
