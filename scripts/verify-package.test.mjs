import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import { strToU8, zipSync } from 'fflate';
import { PRODUCTION_API_ORIGIN, verifyArchive } from './verify-package-lib.mjs';

const expectedVersion = '0.2.0';

function archive(overrides = {}) {
  const manifest = {
    manifest_version: 3,
    name: 'Creator Copilot',
    version: expectedVersion,
    permissions: ['sidePanel', 'storage', 'activeTab', 'scripting'],
    host_permissions: [`${PRODUCTION_API_ORIGIN}/*`],
  };
  const files = {
    'manifest.json': strToU8(JSON.stringify(manifest)),
    'index.html': strToU8('<!doctype html><main>Creator Copilot</main>'),
    'assets/app.js': strToU8(`fetch('${PRODUCTION_API_ORIGIN}/v1/health')`),
    ...overrides,
  };
  return zipSync(files);
}

function expectRejected(bytes, message) {
  assert.throws(() => verifyArchive(bytes, { expectedVersion, expectedApiOrigin: PRODUCTION_API_ORIGIN }), message);
}

describe('release package verification', () => {
  it('accepts the exact release permissions, version, and API origin', () => {
    const result = verifyArchive(archive(), { expectedVersion, expectedApiOrigin: PRODUCTION_API_ORIGIN });
    assert.equal(result.manifest.version, expectedVersion);
    assert.equal(result.files.length, 3);
  });

  it('rejects source maps, tests, fixtures, environment files, and dev vars', () => {
    for (const filename of ['assets/app.js.map', 'src/app.test.js', 'fixtures/page.json', '.env.production', '.dev.vars']) {
      expectRejected(archive({ [filename]: strToU8('unsafe') }), filename);
    }
  });

  it('rejects embedded secret-shaped values without echoing the value', () => {
    const secret = `sk-proj-${'x'.repeat(40)}`;
    let message = '';
    try {
      verifyArchive(archive({ 'assets/app.js': strToU8(`const api='${PRODUCTION_API_ORIGIN}';const key='${secret}'`) }), {
        expectedVersion,
        expectedApiOrigin: PRODUCTION_API_ORIGIN,
      });
    } catch (error) {
      message = String(error);
    }
    assert.match(message, /secret/i);
    assert.equal(message.includes(secret), false);
  });

  it('rejects localhost, development endpoints, and unexpected hosts', () => {
    expectRejected(archive({ 'assets/app.js': strToU8(`const api='${PRODUCTION_API_ORIGIN}';fetch('http://127.0.0.1:8787')`) }), /development endpoint/i);
    expectRejected(archive({ 'assets/app.js': strToU8(`const api='${PRODUCTION_API_ORIGIN}';fetch('https://api-dev.example.test')`) }), /development endpoint/i);
    expectRejected(archive({ 'assets/app.js': strToU8(`const api='${PRODUCTION_API_ORIGIN}';fetch('https://unexpected.example/api')`) }), /unexpected remote host/i);
  });

  it('rejects broad or unexpected Chrome permissions', () => {
    const broadManifest = {
      manifest_version: 3,
      name: 'Creator Copilot',
      version: expectedVersion,
      permissions: ['sidePanel', 'storage', 'activeTab', 'scripting', 'cookies'],
      host_permissions: ['<all_urls>'],
    };
    expectRejected(archive({ 'manifest.json': strToU8(JSON.stringify(broadManifest)) }), /permissions/i);
  });

  it('rejects mismatched versions and API origins', () => {
    const oldManifest = {
      manifest_version: 3,
      name: 'Creator Copilot',
      version: '0.1.0',
      permissions: ['sidePanel', 'storage', 'activeTab', 'scripting'],
      host_permissions: [`${PRODUCTION_API_ORIGIN}/*`],
    };
    expectRejected(archive({ 'manifest.json': strToU8(JSON.stringify(oldManifest)) }), /version/i);
    expectRejected(archive({ 'assets/app.js': strToU8("fetch('https://unexpected.example')") }), /production API origin/i);
  });
});
