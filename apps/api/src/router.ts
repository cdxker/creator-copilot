import { API_SCHEMA_VERSION } from '@creator-copilot/shared';
import { errorResponse } from './errors';

export const MAX_JSON_BODY_BYTES = 24 * 1024;

export type Logger = Pick<Console, 'error' | 'info' | 'warn'>;

export type RouterDependencies = {
  allowedOrigins: ReadonlySet<string>;
  logger?: Logger;
};

export type JsonBodyResult =
  | { ok: true; value: unknown }
  | { ok: false; status: 400 | 413 | 415; message: string };

function securityHeaders(origin?: string): HeadersInit {
  return {
    'cache-control': 'no-store',
    'content-type': 'application/json; charset=utf-8',
    'x-content-type-options': 'nosniff',
    ...(origin ? { 'access-control-allow-origin': origin, vary: 'Origin' } : {}),
  };
}

function json(value: unknown, status = 200, origin?: string, extraHeaders?: HeadersInit): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { ...securityHeaders(origin), ...extraHeaders },
  });
}

export async function readJsonBody(request: Request): Promise<JsonBodyResult> {
  const contentType = request.headers.get('content-type')?.toLowerCase() ?? '';
  if (!contentType.startsWith('application/json')) {
    return { ok: false, status: 415, message: 'Content-Type must be application/json.' };
  }

  const declaredLength = Number.parseInt(request.headers.get('content-length') ?? '0', 10);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_JSON_BODY_BYTES) {
    return { ok: false, status: 413, message: 'Request body is too large.' };
  }

  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.byteLength > MAX_JSON_BODY_BYTES) {
    return { ok: false, status: 413, message: 'Request body is too large.' };
  }

  try {
    return { ok: true, value: JSON.parse(new TextDecoder().decode(bytes)) as unknown };
  } catch {
    return { ok: false, status: 400, message: 'Request body must contain valid JSON.' };
  }
}

export function createRouter({ allowedOrigins, logger = console }: RouterDependencies) {
  return {
    async fetch(request: Request): Promise<Response> {
      const originHeader = request.headers.get('origin') ?? undefined;
      const allowedOrigin = originHeader && allowedOrigins.has(originHeader) ? originHeader : undefined;

      if (originHeader && !allowedOrigin) {
        logger.warn('Request rejected by origin policy.');
        return errorResponse(403, {
          code: 'origin_not_allowed',
          message: 'This client origin is not allowed.',
        });
      }

      if (request.method === 'OPTIONS') {
        if (!allowedOrigin) {
          return errorResponse(403, {
            code: 'origin_not_allowed',
            message: 'An allowed origin is required for preflight.',
          });
        }
        return new Response(null, {
          status: 204,
          headers: {
            'access-control-allow-origin': allowedOrigin,
            'access-control-allow-methods': 'GET, POST, DELETE, OPTIONS',
            'access-control-allow-headers': 'Authorization, Content-Type',
            'access-control-max-age': '600',
            vary: 'Origin',
          },
        });
      }

      const url = new URL(request.url);
      if (url.pathname === '/v1/health') {
        if (request.method !== 'GET') {
          return errorResponse(
            405,
            { code: 'method_not_allowed', message: 'Method not allowed.' },
            { ...securityHeaders(allowedOrigin), allow: 'GET' },
          );
        }
        return json({ ok: true, schemaVersion: API_SCHEMA_VERSION }, 200, allowedOrigin);
      }

      return errorResponse(
        404,
        { code: 'not_found', message: 'Route not found.' },
        securityHeaders(allowedOrigin),
      );
    },
  };
}
