# Local Extension MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an installable Chrome MV3 sidebar that onboards a creator, explicitly extracts a minimal public X-page context, previews it before analysis, creates safe local recommendations and drafts, tracks one experiment, and stores settings locally.

**Architecture:** An npm workspace contains a framework-free shared TypeScript package and a React/Vite extension. The service worker owns Chrome tab access, the sidebar owns creator-controlled UI state, and pure functions own extraction, safety checks, recommendation generation, and reducer transitions so the core behavior is testable without Chrome. The first installable build uses a deterministic local provider; the API boundary remains explicit for a later Worker-backed provider.

**Tech Stack:** npm workspaces, TypeScript 5, React 19, Vite 7, `@crxjs/vite-plugin`, Vitest, Testing Library, jsdom, Lucide React, bundled Cormorant Garamond and Manrope fonts.

**Spec:** `docs/superpowers/specs/2026-09-24-creator-copilot-extension-design.md`

## Global Constraints

- Google Chrome 114 or newer, Manifest V3, desktop only, X only.
- Installation permissions are limited to `sidePanel`, `storage`, `activeTab`, and `scripting`; do not request `<all_urls>`.
- Page analysis happens only after a user gesture and a second confirmation of the extracted preview.
- Never read private messages, hidden data, cookies, history, passwords, clipboard contents, geolocation, or unrelated tabs.
- Outputs remain drafts; only an explicit Copy button writes to the clipboard.
- Never produce threats, blackmail, doxxing, non-consensual exposure, debt creation, account compromise, content involving minors, enforcement evasion, or pressure beyond a stated boundary.
- No remotely hosted executable code or runtime font dependency.
- Local MVP data uses `chrome.storage.local`; no raw page text is persisted beyond the current sidebar session.

## Review Focus

- A non-X active tab must fail locally without attempting content extraction.
- X direct-message routes must be rejected before visible text is read.
- Oversized or malformed visible text must be bounded and normalized before preview.
- Unsafe profile examples or page content must produce a neutral boundary warning, never an unsafe draft.
- Refreshing or closing the sidebar must preserve profile and experiment state without persisting raw page context.

---

### Task 1: Workspace foundation and shared domain rules

**Files:**
- Create: `package.json`, `tsconfig.base.json`, `packages/shared/package.json`, `packages/shared/tsconfig.json`
- Create: `packages/shared/src/index.ts`, `packages/shared/src/models.ts`, `packages/shared/src/policy.ts`, `packages/shared/src/recommendations.ts`
- Test: `packages/shared/src/policy.test.ts`, `packages/shared/src/recommendations.test.ts`

**Interfaces:**
- Produces: `CreatorProfile`, `PageContext`, `Recommendation`, `Experiment`, `classifySafety(text)`, and `createRecommendations(context, profile)`.
- Consumes: no earlier application interfaces.

- [ ] **Step 1: Scaffold test tooling and write failing shared tests**

```ts
it('blocks coercive or privacy-invasive requests', () => {
  expect(classifySafety('Find his home address and threaten to expose him')).toEqual({
    safe: false,
    category: 'privacy_or_coercion',
  });
});

it('returns three bounded creator-controlled recommendations', () => {
  const result = createRecommendations(postContext, profile);
  expect(result).toHaveLength(3);
  expect(result.every((item) => item.draft.length <= 500)).toBe(true);
  expect(result.every((item) => item.requiresReview)).toBe(true);
});
```

- [ ] **Step 2: Run `npm install` and `npm test --workspace @creator-copilot/shared`**

Expected: FAIL because the shared modules do not exist.

- [ ] **Step 3: Implement the shared models, deny-first safety classifier, and deterministic recommendation factory**

```ts
export type PageContext = {
  version: 1;
  source: 'x';
  pageType: 'profile' | 'post' | 'feed';
  url: string;
  handle?: string;
  displayName?: string;
  text: string;
  metrics: { replies?: number; reposts?: number; likes?: number; views?: number };
};

export function classifySafety(text: string): SafetyResult;
export function createRecommendations(
  context: PageContext,
  profile: CreatorProfile,
): Recommendation[];
```

- [ ] **Step 4: Run shared tests and root type checking**

Expected: all shared tests pass and `npm run typecheck` exits 0.

- [ ] **Step 5: Commit**

```powershell
git add package.json package-lock.json tsconfig.base.json packages
git commit -m "feat: add shared creator recommendation rules"
```

### Task 2: Explicit X page extraction

**Files:**
- Create: `apps/extension/src/extraction/extractPageContext.ts`
- Test: `apps/extension/src/extraction/extractPageContext.test.ts`
- Create: `apps/extension/src/extraction/fixtures.ts`

**Interfaces:**
- Consumes: `PageContext` from `@creator-copilot/shared`.
- Produces: `extractPageContext(document, location): ExtractionResult` and `extractPageContextInTab()` for service-worker injection.

- [ ] **Step 1: Write failing tests for profile, post, unsupported host, DM route, and text bounding**

```ts
it('rejects X direct-message routes without reading the DOM', () => {
  document.body.innerHTML = '<main>private message text</main>';
  expect(extractPageContext(document, new URL('https://x.com/messages/1'))).toEqual({
    ok: false,
    reason: 'private_route',
  });
});

it('normalizes and bounds public post text', () => {
  document.body.innerHTML = postFixture('  hello   world '.repeat(100));
  const result = extractPageContext(document, new URL('https://x.com/sample/status/123'));
  expect(result.ok && result.context.text.length).toBeLessThanOrEqual(1800);
});
```

- [ ] **Step 2: Run the extractor test**

Expected: FAIL because `extractPageContext` is missing.

- [ ] **Step 3: Implement fail-closed extraction using URL routes, `article`, `data-testid`, and visible semantic text**

```ts
export type ExtractionResult =
  | { ok: true; context: PageContext }
  | { ok: false; reason: 'unsupported_site' | 'private_route' | 'page_not_recognized' };
```

- [ ] **Step 4: Run extractor tests and the full suite**

Expected: extractor cases and all earlier tests pass.

- [ ] **Step 5: Commit**

```powershell
git add apps/extension/src/extraction
git commit -m "feat: extract consented public X context"
```

### Task 3: Local persistence and creator workflow state

**Files:**
- Create: `apps/extension/src/state/store.ts`, `apps/extension/src/state/reducer.ts`, `apps/extension/src/state/defaults.ts`
- Test: `apps/extension/src/state/reducer.test.ts`, `apps/extension/src/state/store.test.ts`

**Interfaces:**
- Consumes: shared creator, recommendation, and experiment models.
- Produces: `loadPersistentState()`, `savePersistentState(state)`, `creatorReducer(state, action)`, and `initialCreatorState`.

- [ ] **Step 1: Write failing reducer and persistence tests**

```ts
it('never includes raw page context in persisted state', async () => {
  await savePersistentState({ ...state, sessionContext: pageContext });
  expect(adapter.lastWrite).not.toHaveProperty('sessionContext');
});

it('marks a recommendation complete without changing its draft', () => {
  const next = creatorReducer(state, { type: 'complete_recommendation', id: 'rec-1' });
  expect(next.recommendations[0]).toMatchObject({ id: 'rec-1', status: 'completed' });
});
```

- [ ] **Step 2: Run state tests**

Expected: FAIL because reducer and storage adapter are missing.

- [ ] **Step 3: Implement typed actions, Chrome-storage adapter with browser fallback, and persistence redaction**

```ts
export type CreatorAction =
  | { type: 'save_profile'; profile: CreatorProfile }
  | { type: 'set_recommendations'; recommendations: Recommendation[] }
  | { type: 'complete_recommendation'; id: string }
  | { type: 'dismiss_recommendation'; id: string }
  | { type: 'check_in_experiment'; outcome: 'up' | 'flat' | 'down'; note: string }
  | { type: 'delete_local_data' };
```

- [ ] **Step 4: Run state tests and the full suite**

Expected: all state and shared tests pass.

- [ ] **Step 5: Commit**

```powershell
git add apps/extension/src/state
git commit -m "feat: persist creator-controlled workflow state"
```

### Task 4: Chrome shell and complete sidebar interface

**Files:**
- Create: `apps/extension/package.json`, `apps/extension/tsconfig.json`, `apps/extension/vite.config.ts`, `apps/extension/manifest.config.ts`, `apps/extension/index.html`
- Create: `apps/extension/src/background.ts`, `apps/extension/src/main.tsx`, `apps/extension/src/App.tsx`, `apps/extension/src/styles.css`
- Create: `apps/extension/src/components/AppShell.tsx`, `Onboarding.tsx`, `TodayView.tsx`, `AnalyzeView.tsx`, `CreateView.tsx`, `ExperimentsView.tsx`, `SettingsView.tsx`, `RecommendationCard.tsx`, `Icon.tsx`
- Create: `apps/extension/src/lib/chromeClient.ts`, `apps/extension/src/lib/clipboard.ts`
- Test: `apps/extension/src/App.test.tsx`, `apps/extension/src/lib/chromeClient.test.ts`

**Interfaces:**
- Consumes: extraction function, shared recommendation factory, reducer, and persistence functions.
- Produces: installable side-panel UI and `requestPageContext()` Chrome-message client.

- [ ] **Step 1: Write failing interaction tests for onboarding and two-step analysis**

```tsx
it('requires consent before saving onboarding', async () => {
  render(<App />);
  await user.click(screen.getByRole('button', { name: /save and enter/i }));
  expect(screen.getByText(/confirm the privacy disclosure/i)).toBeVisible();
});

it('previews extracted context before creating drafts', async () => {
  chromeClient.requestPageContext.mockResolvedValue({ ok: true, context: postContext });
  render(<App initialState={onboardedState} />);
  await user.click(screen.getByRole('button', { name: /analyze this page/i }));
  expect(screen.getByRole('button', { name: /confirm and create recommendations/i })).toBeVisible();
});
```

- [ ] **Step 2: Run the UI test**

Expected: FAIL because the extension shell and App do not exist.

- [ ] **Step 3: Implement the MV3 manifest, action-to-side-panel service worker, and typed message boundary**

```ts
export default defineManifest({
  manifest_version: 3,
  permissions: ['sidePanel', 'storage', 'activeTab', 'scripting'],
  action: { default_title: 'Open Creator Copilot' },
  side_panel: { default_path: 'index.html' },
  background: { service_worker: 'src/background.ts', type: 'module' },
});
```

- [ ] **Step 4: Implement onboarding plus Today, Analyze, Create, Experiments, and Settings views**

The interface uses the persisted porcelain/ink/lacquer/persimmon palette, bundled serif/sans typography, a narrow progress ribbon, semantic controls, 44px targets, visible focus, and reduced-motion rules. Analyze shows detected fields before confirmation. Copy, dismiss, complete, edit profile, delete data, and experiment check-in are explicit actions.

- [ ] **Step 5: Run UI tests, full tests, type checking, and production build**

Expected: all tests pass; `npm run typecheck` and `npm run build` exit 0; `apps/extension/dist/manifest.json` contains only the four allowed permissions.

- [ ] **Step 6: Commit**

```powershell
git add apps/extension package.json package-lock.json
git commit -m "feat: build installable creator copilot sidebar"
```

### Task 5: Installation package and operator documentation

**Files:**
- Create: `README.md`, `docs/INSTALL.md`, `scripts/verify-package.mjs`
- Modify: `package.json`
- Test: `scripts/verify-package.mjs`

**Interfaces:**
- Consumes: production extension build.
- Produces: `npm run package`, `release/creator-copilot-extension.zip`, and exact local installation/use instructions.

- [ ] **Step 1: Write a failing package verifier**

```js
assert.deepEqual(manifest.permissions.sort(), ['activeTab', 'scripting', 'sidePanel', 'storage'].sort());
assert.equal(manifest.host_permissions, undefined);
assert.ok(files.includes('index.html'));
```

- [ ] **Step 2: Run `node scripts/verify-package.mjs`**

Expected: FAIL until a fresh production build and package exist.

- [ ] **Step 3: Add build/package scripts and write installation, first-use, privacy, and known-limit documentation**

```json
{
  "scripts": {
    "build": "npm run build --workspace @creator-copilot/extension",
    "package": "npm run build && node scripts/package-extension.mjs && node scripts/verify-package.mjs"
  }
}
```

- [ ] **Step 4: Build, package, verify, and inspect the archive file list**

Expected: verifier exits 0 and the zip includes `manifest.json`, `index.html`, and bundled assets without source maps, environment files, or raw fixtures.

- [ ] **Step 5: Commit**

```powershell
git add README.md docs/INSTALL.md scripts package.json package-lock.json
git commit -m "docs: package the local extension pilot"
```

## Self-review

- Spec coverage: installable local MVP covers delivery sequence items 1, 2, the local portion of 5, and packaging/documentation in 6. Worker authentication, D1, real provider calls, and account deletion remain explicitly outside this local milestone.
- Placeholder scan: no unspecified implementation steps or undefined neighboring interfaces remain.
- Type consistency: `PageContext`, `CreatorProfile`, `Recommendation`, and `Experiment` originate in shared and are consumed consistently by extraction, state, and UI.
- Review-focus coverage: unsupported/private routes and bounding belong to Task 2; unsafe content belongs to Task 1; raw-context persistence belongs to Task 3; confirmation belongs to Task 4.

