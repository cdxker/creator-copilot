import { describe, expect, it, vi } from 'vitest';
import { API_SCHEMA_VERSION } from '@creator-copilot/shared';
import { MAX_JSON_BODY_BYTES, createRouter, readJsonBody } from './router';

const allowedOrigin = 'chrome-extension://abcdefghijklmnopabcdefghijklmnop';

function request(path: string, init: RequestInit = {}) {
  return new Request(`https://api.creatorcopilot.test${path}`, init);
}

describe('createRouter', () => {
  it('returns a minimal health response', async () => {
    const router = createRouter({ allowedOrigins: new Set([allowedOrigin]) });
    const response = await router.fetch(request('/v1/health'));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, schemaVersion: API_SCHEMA_VERSION });
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
  });

  it('rejects disallowed origins before routing', async () => {
    const logger = { error: vi.fn(), info: vi.fn(), warn: vi.fn() };
    const router = createRouter({ allowedOrigins: new Set([allowedOrigin]), logger });
    const response = await router.fetch(
      request('/v1/health', { headers: { origin: 'https://attacker.example' } }),
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({
      ok: false,
      error: { code: 'origin_not_allowed', retryable: false },
    });
    expect(response.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('handles an allowed preflight without reflecting arbitrary headers', async () => {
    const router = createRouter({ allowedOrigins: new Set([allowedOrigin]) });
    const response = await router.fetch(
      request('/v1/analyses', {
        method: 'OPTIONS',
        headers: {
          origin: allowedOrigin,
          'access-control-request-method': 'POST',
          'access-control-request-headers': 'authorization, content-type, x-evil',
        },
      }),
    );

    expect(response.status).toBe(204);
    expect(response.headers.get('access-control-allow-origin')).toBe(allowedOrigin);
    expect(response.headers.get('access-control-allow-methods')).toBe('GET, POST, DELETE, OPTIONS');
    expect(response.headers.get('access-control-allow-headers')).toBe('Authorization, Content-Type');
  });

  it('returns stable errors for unknown routes and invalid methods', async () => {
    const router = createRouter({ allowedOrigins: new Set([allowedOrigin]) });
    const missing = await router.fetch(request('/v1/nope'));
    const wrongMethod = await router.fetch(request('/v1/health', { method: 'POST' }));

    expect(missing.status).toBe(404);
    expect(await missing.json()).toMatchObject({ ok: false, error: { code: 'not_found' } });
    expect(wrongMethod.status).toBe(405);
    expect(wrongMethod.headers.get('allow')).toBe('GET');
  });
});

describe('readJsonBody', () => {
  it('requires application/json', async () => {
    const result = await readJsonBody(
      request('/v1/analyses', { method: 'POST', body: 'hello', headers: { 'content-type': 'text/plain' } }),
    );

    expect(result).toEqual({ ok: false, status: 415, message: 'Content-Type must be application/json.' });
  });

  it('rejects a declared or actual body larger than 24 KiB', async () => {
    const declared = await readJsonBody(
      request('/v1/analyses', {
        method: 'POST',
        body: '{}',
        headers: { 'content-type': 'application/json', 'content-length': String(MAX_JSON_BODY_BYTES + 1) },
      }),
    );
    const actual = await readJsonBody(
      request('/v1/analyses', {
        method: 'POST',
        body: JSON.stringify({ value: 'x'.repeat(MAX_JSON_BODY_BYTES) }),
        headers: { 'content-type': 'application/json' },
      }),
    );

    expect(declared).toMatchObject({ ok: false, status: 413 });
    expect(actual).toMatchObject({ ok: false, status: 413 });
  });

  it('parses a bounded JSON object', async () => {
    const result = await readJsonBody(
      request('/v1/analyses', {
        method: 'POST',
        body: JSON.stringify({ hello: 'world' }),
        headers: { 'content-type': 'application/json; charset=utf-8' },
      }),
    );

    expect(result).toEqual({ ok: true, value: { hello: 'world' } });
  });
});
