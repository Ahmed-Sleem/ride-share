/* ══════════════════════════════════════════════════════════════════════
   One error shape, once (§0.3, §8.2, P0.6). Every error — handled or not —
   renders as { code, message_key, details, request_id }. message_key is a
   translation key, never English prose, so the Arabic user never receives
   English errors (CH9 §9.3). Internals (stack, query text, secrets) are
   logged, never sent to the client.
   ══════════════════════════════════════════════════════════════════════ */
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Optional,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { PinoLoggerService } from '../logging/logger.js';

export interface ErrorBody {
  code: string;
  message_key: string;
  details?: unknown;
  request_id: string;
}

const STATUS_CODE: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
  [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
  [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
  [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
  [HttpStatus.CONFLICT]: 'CONFLICT',
  [HttpStatus.UNPROCESSABLE_ENTITY]: 'VALIDATION',
  [HttpStatus.TOO_MANY_REQUESTS]: 'TOO_MANY_REQUESTS',
  [HttpStatus.SERVICE_UNAVAILABLE]: 'UNAVAILABLE',
};

/** A translation key for a status, used when the thrown message is prose. */
const STATUS_KEY: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: 'error.bad_request',
  [HttpStatus.UNAUTHORIZED]: 'error.unauthorized',
  [HttpStatus.FORBIDDEN]: 'error.forbidden',
  [HttpStatus.NOT_FOUND]: 'error.not_found',
  [HttpStatus.CONFLICT]: 'error.conflict',
  [HttpStatus.UNPROCESSABLE_ENTITY]: 'error.validation',
  [HttpStatus.TOO_MANY_REQUESTS]: 'error.too_many_requests',
  [HttpStatus.SERVICE_UNAVAILABLE]: 'error.unavailable',
};

/** A message is a translation key when it contains no spaces (dot notation). */
function isKey(message: string): boolean {
  return !message.includes(' ') && message.includes('.');
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger: PinoLoggerService;

  constructor(@Optional() logger?: PinoLoggerService) {
    this.logger = logger ?? new PinoLoggerService();
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<FastifyReply>();
    const req = ctx.getRequest<FastifyRequest & { ctx?: { requestId?: string } }>();
    const requestId = req?.ctx?.requestId ?? req?.id ?? 'unknown';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL';
    let messageKey = 'error.internal';
    let details: unknown;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      code = STATUS_CODE[status] ?? 'ERROR';
      const response = exception.getResponse();
      if (typeof response === 'string') {
        // Prose ("Cannot GET /nope") is never a key; map it to the status key.
        messageKey = isKey(response) ? response : (STATUS_KEY[status] ?? 'error.internal');
      } else if (response && typeof response === 'object') {
        const r = response as { message_key?: string; message?: string | string[]; details?: unknown };
        const raw = r.message_key ?? (Array.isArray(r.message) ? r.message[0] : r.message) ?? '';
        messageKey = isKey(raw) ? raw : (STATUS_KEY[status] ?? 'error.internal');
        details = r.details;
      }
    } else {
      // Unexpected error: log the real thing (redacted by the logger), send a generic key.
      this.logger.error('unhandled exception', { err: exception, request_id: requestId });
    }

    const body: ErrorBody = { code, message_key: messageKey, details, request_id: requestId };
    if (status >= 500) {
      this.logger.error('request failed', { status, code, message_key: messageKey, request_id: requestId });
    }
    void res.status(status).send(body);
  }
}
