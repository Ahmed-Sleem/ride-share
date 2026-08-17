/* ══════════════════════════════════════════════════════════════════════
   The one structured logger (§0.3, §9 rule 9). pino with central redaction:
   tokens, passwords, secrets and authorization headers are redacted HERE,
   at the logger — not per call site — so a new endpoint inherits it.
   No console.log in production paths (enforced by lint).
   ══════════════════════════════════════════════════════════════════════ */
import { pino, type Logger } from 'pino';
import { Injectable, LoggerService } from '@nestjs/common';

export const REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["x-api-key"]',
  '*.password',
  '*.secret',
  '*.token',
  '*.hmac',
  '*.apiKey',
  '*.authorization',
];

export function createLogger(level = 'info'): Logger {
  return pino({
    level,
    redact: { paths: REDACT_PATHS, censor: '[REDACTED]' },
    base: { service: 'api' },
    formatters: {
      level: (label) => ({ level: label }),
    },
  });
}

/** Nest-compatible logger service backed by the one pino instance. */
@Injectable()
export class PinoLoggerService implements LoggerService {
  constructor(private readonly pino: Logger = createLogger()) {}

  log(message: unknown, ...args: unknown[]): void {
    this.pino.info(this.fmt(message, args));
  }
  error(message: unknown, ...args: unknown[]): void {
    this.pino.error(this.fmt(message, args));
  }
  warn(message: unknown, ...args: unknown[]): void {
    this.pino.warn(this.fmt(message, args));
  }
  debug(message: unknown, ...args: unknown[]): void {
    this.pino.debug(this.fmt(message, args));
  }
  verbose(message: unknown, ...args: unknown[]): void {
    this.pino.trace(this.fmt(message, args));
  }
  fatal(message: unknown, ...args: unknown[]): void {
    this.pino.fatal(this.fmt(message, args));
  }

  private fmt(message: unknown, args: unknown[]): Record<string, unknown> {
    if (typeof message === 'string' && args.length > 0) {
      return { msg: message, context: args[0] };
    }
    return { msg: message as string };
  }
}
