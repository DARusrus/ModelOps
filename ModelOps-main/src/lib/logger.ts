/**
 * Centralized production-grade logger for the ModelOps backend.
 * Provides structured JSON logging in production and human-readable formatting in development.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class StructuredLogger {
  private sanitizeError(arg: unknown): unknown {
    if (arg instanceof Error) {
      return { name: arg.name, message: arg.message, stack: arg.stack };
    }
    return arg;
  }

  private log(level: LogLevel, message: string, args: unknown[]) {
    const isProd = process.env.NODE_ENV === 'production';
    const timestamp = new Date().toISOString();

    if (isProd) {
      // Structured JSON logging for production observability (e.g., Datadog, ELK)
      const logEntry = {
        timestamp,
        level,
        message,
        ...(args.length > 0 ? { context: args.map(this.sanitizeError) } : {}),
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
          console.error(prefix, message, ...args);
          break;
        case 'warn':
          console.warn(prefix, message, ...args);
          break;
        case 'info':
          console.info(prefix, message, ...args);
          break;
        case 'debug':
          console.debug(prefix, message, ...args);
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
