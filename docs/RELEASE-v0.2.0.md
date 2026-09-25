# Creator Copilot v0.2.0 release evidence

Status: release candidate; production deployment and Chrome Web Store submission are not yet complete.

## Artifact

- File: `release/creator-copilot-extension.zip`
- Version: `0.2.0`
- SHA-256: `4AAED645F94F01A47124395B19289CBCAD16C48C0B99F4332861E48D75C62009`
- Files: 18
- Production API origin: `https://creator-copilot-api.popcorntoohot.workers.dev`

The ZIP is generated from `apps/extension/dist` and is intentionally ignored by Git. Upload this exact file to the GitHub release and Chrome Web Store after the final verification run.

## Approved Chrome access

- Permissions: `activeTab`, `scripting`, `sidePanel`, `storage`
- Host permission: `https://creator-copilot-api.popcorntoohot.workers.dev/*`
- No `<all_urls>`, cookies, history, identity, payment, or persistent X host permission

## Verification completed September 24, 2026

Commands:

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run package
```

Results:

- 96 tests passed: API 37, extension 35, shared 18, package policy 6.
- All three TypeScript workspace checks passed.
- Vite production build passed.
- Package verifier passed with 18 files, four approved permissions, and one production API host.
- The verifier rejects source maps, tests, fixtures, environment files, `.dev.vars`, secret-shaped values, localhost/development URLs, unexpected remote hosts, broad permissions, and version mismatches.

## ZIP contents

```text
assets/background.ts-DZtjI47J.js
assets/cormorant-garamond-latin-600-normal-2CBVLo0M.woff
assets/cormorant-garamond-latin-600-normal-Co1r35X9.woff2
assets/cormorant-garamond-latin-700-normal-DajfzrDU.woff2
assets/cormorant-garamond-latin-700-normal-O25Qpphb.woff
assets/index-DHc7Qu-Z.css
assets/index.html-e8umQ_L9.js
assets/manrope-latin-400-normal-8tf8FM3T.woff
assets/manrope-latin-400-normal-PaqtzbVb.woff2
assets/manrope-latin-500-normal-BYYD-dBL.woff2
assets/manrope-latin-500-normal-DMZssgOp.woff
assets/manrope-latin-600-normal-4f0koTD-.woff2
assets/manrope-latin-600-normal-BqgrALkZ.woff
assets/manrope-latin-700-normal-BZp_XxE4.woff2
assets/manrope-latin-700-normal-DGRFkw-m.woff
index.html
manifest.json
service-worker-loader.js
```

## Deployment evidence pending

- Production Worker health and public page results
- Production D1 migrations
- Bounded live OpenAI request identifier and quota result
- Final clean-install Chrome smoke test
- GitHub release URL and downloaded-artifact hash
- Chrome Web Store item ID and review status
