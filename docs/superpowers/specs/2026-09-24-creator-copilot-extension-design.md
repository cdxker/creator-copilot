# Creator Copilot Extension Design

## Status

Proposed design for user review. "Creator Copilot" is the internal working title, not the final public brand.

## Product summary

Creator Copilot is a standalone, AI-assisted Chrome extension for findommes and adjacent adult creator businesses. It opens as a sidebar beside X and turns the creator's current page context into actionable recommendations, drafts, and measurable experiments.

The product is not an autonomous persona or surveillance tool. The creator remains in control of her identity, accounts, content, prices, boundaries, and published communications. AI prepares work; the creator reviews and performs the final publish or send action.

## Initial customer and problem

The first users are independent findommes who already post on X but lack a repeatable operating system for content, audience qualification, monetization offers, follow-up, and performance review.

Their recurring problems are:

- deciding what to post every day;
- maintaining a consistent persona and voice;
- recognizing which public interactions deserve attention;
- converting profile attention into permitted off-platform or creator-platform actions;
- remembering follow-ups without manually maintaining a spreadsheet;
- understanding which posts and offers produce useful outcomes;
- separating genuine prospects from spam and time-wasters.

## MVP success criteria

The private pilot will recruit 15 creators. The MVP is successful if, within four weeks:

- at least 70% complete onboarding and their first page analysis;
- at least 40% remain active in week two;
- the median active creator accepts, copies, or completes at least five recommendations per week;
- at least eight creators complete a weekly outcome check-in;
- at least half of retained testers state that they would pay at least $49 per month;
- no tester reports an undisclosed permission, unauthorized message, or unexpected collection of sensitive browser data.

Revenue lift will be collected as a directional, creator-reported metric during the pilot. The MVP will not claim causal revenue attribution before platform integrations or reliable conversion events exist.

## MVP scope

### Supported environment

- Google Chrome 114 or newer.
- Manifest V3 extension.
- X is the only supported website in version one.
- Desktop only.

### Sidebar experience

The sidebar contains five views:

1. **Today**: a prioritized daily checklist and three recommended actions.
2. **Analyze**: an explicit button that reads the visible X page and explains what context was detected.
3. **Create**: post, reply, hook, CTA, and content-series drafts in the creator's configured voice.
4. **Experiments**: one active growth or monetization experiment with a hypothesis, instructions, and outcome check-in.
5. **Settings**: persona, tone, boundaries, goals, consent, data controls, and connection status.

### Context-aware recommendations

After the creator explicitly invokes analysis, the extension may extract the visible page type, public account handle, post text, public engagement counts, and visible public replies. It then produces structured recommendations such as:

- strengthen a post's hook or CTA;
- draft a reply in the configured voice;
- suggest a follow-up post based on a high-performing theme;
- identify a public interaction worth reviewing;
- recommend a profile, offer, or posting experiment;
- warn when a draft conflicts with the creator's configured boundary or platform policy.

The MVP does not read private messages, hidden account data, cookies, browsing history, saved passwords, clipboard contents, geolocation, or unrelated tabs.

### Human-controlled actions

All outputs are drafts. Version one supports copying text to the clipboard only after an explicit button click. It does not automatically post, send messages, follow accounts, like content, purchase anything, or change account settings.

### Creator onboarding

Onboarding collects:

- public creator handle;
- brand voice examples supplied by the creator;
- allowed and prohibited tones or topics;
- content frequency and preferred formats;
- primary monetization destination;
- weekly business goal;
- explicit consent to AI processing and the product's privacy disclosures.

The creator can edit or delete this profile at any time.

## Non-goals for version one

- autonomous posting or direct messaging;
- impersonating a creator without disclosure;
- private-message analysis;
- integrations with LoyalFans, Fanvue, Fansly, Discord, Reddit, payment processors, or banking services;
- browser-wide tracking;
- a marketplace for creators or supporters;
- supporter psychological profiles;
- prediction markets, gambling, or wagering features;
- billing or agency revenue-share calculations;
- mobile browser support;
- multi-user agency dashboards.

## Privacy and permission model

The extension requests only `sidePanel`, `storage`, `activeTab`, and `scripting` at installation. It does not request `<all_urls>`.

Analysis is user initiated. `activeTab` grants temporary access to the current X tab after an extension action. If pilot feedback shows that repeated invocation is too cumbersome, persistent access to `https://x.com/*` may be offered later as an optional runtime permission with a separate explanation and consent step.

Raw page text is transmitted over HTTPS for the requested AI analysis and discarded after the response. It is not stored in application logs or the database. The backend stores only:

- the creator profile;
- generated recommendations and drafts;
- user actions on those recommendations;
- experiment definitions and check-ins;
- aggregate product analytics;
- consent and deletion records.

Sensitive fields are encrypted at rest. Logs redact page text, access tokens, and creator-provided examples. Users can export or delete their stored data.

## Safety and trust rules

The recommendation engine will not produce instructions involving threats, blackmail, doxxing, non-consensual exposure, debt creation, account compromise, minors, evasion of platform enforcement, or pressure to spend beyond a stated boundary. It will not recommend misrepresenting who authored a message.

The product may support consensual dominance language, but it must keep creator-configured boundaries visible and apply them before generating output.

## Technical architecture

The repository will be a TypeScript workspace with three packages:

```text
creator-copilot/
  apps/
    extension/     Chrome MV3 extension and React sidebar
    api/           Cloudflare Worker API
  packages/
    shared/        schemas, recommendation types, policy rules
  docs/
```

### Extension

- React, TypeScript, and Vite.
- Manifest V3 service worker.
- Chrome Side Panel API for the primary interface.
- A small content-extraction function injected only after a user gesture.
- Chrome storage for non-sensitive local preferences and session state.
- No remotely hosted executable code.

The extractor returns a small, versioned `PageContext` object rather than arbitrary HTML. It uses visible text and stable semantic cues where available. If X changes its markup, extraction fails closed and shows a clear "page not recognized" state.

### API

- Cloudflare Worker with JSON endpoints.
- Server-side AI provider calls so no model API key ships in the extension.
- D1 for pilot accounts, profiles, recommendations, experiments, and consent records.
- Signed short-lived access tokens issued after email-based pilot authentication.
- Rate limits by account and endpoint.
- Structured logs containing request IDs and error classes, never raw page context.

### Shared package

The shared package owns:

- request and response schemas;
- page-context types;
- recommendation and experiment models;
- safety-policy categories;
- redaction helpers;
- analytics event names.

## Data flow

1. The creator opens X and clicks the extension action.
2. Chrome opens the sidebar and grants temporary access to the active tab.
3. The creator presses **Analyze this page**.
4. The extension extracts a minimal `PageContext` and previews what will be analyzed.
5. After confirmation, the extension sends the context and creator-profile identifier to the API.
6. The API validates the payload, applies safety rules, calls the AI provider, and validates the structured response.
7. Raw context is discarded. The structured recommendation is saved and returned.
8. The creator may copy, dismiss, edit, or mark the recommendation complete.
9. Only that action and the recommendation record are retained for product analytics.

## Error handling

- Unsupported pages produce a local explanation without calling the API.
- Extraction failures return no partial private content.
- Authentication expiry prompts a new sign-in without deleting local drafts.
- AI timeouts show a retry action and preserve the sanitized request locally for the current session only.
- Invalid AI output is rejected by schema validation and replaced with a neutral error state.
- Rate limits explain when the next request is available.
- Network failures never trigger automatic repeated posting or browser actions.

## Testing strategy

### Unit tests

- page-context extraction from sanitized X fixtures;
- schema validation and redaction;
- safety-policy classification;
- recommendation-state transitions;
- permission and unsupported-page behavior.

### Integration tests

- extension-to-worker authenticated request flow;
- AI response validation using a deterministic fake provider;
- D1 persistence and deletion;
- rate limiting and expired authentication;
- confirmation requirement before page context transmission.

### Manual pilot checks

- unpacked extension installation on a clean Chrome profile;
- install-time permission text;
- side panel behavior across X navigation;
- verification that no unrelated tab or site is accessed;
- export and deletion workflow;
- usability with 15 invited creators.

## Pilot operations and budget

The $5,000 pilot budget is allocated as follows:

- $1,500 for fifteen creator testing incentives at $100 each;
- $1,000 for AI, infrastructure, monitoring, email, and analytics;
- $800 for privacy, consent, and creator-agreement review;
- $700 for onboarding, landing-page, and brand assets;
- $1,000 contingency for additional testing, support, and iteration.

Pilot creators receive a fixed testing payment tied to completing onboarding, two weeks of use, and structured feedback. It is not contingent on positive feedback or public promotion.

## Delivery sequence

1. Repository foundation, shared schemas, and static sidebar shell.
2. X active-tab extraction with a local preview and no backend.
3. Worker API, fake AI provider, authentication, and D1 persistence.
4. Real AI provider behind structured validation and safety rules.
5. Onboarding, recommendation actions, experiments, and analytics.
6. Privacy controls, export/deletion, packaging, and pilot documentation.
7. Internal verification followed by the 15-creator private pilot.

## Post-pilot decision

Continue only if the retention, usage, willingness-to-pay, and trust criteria are met. The next product decision will be chosen from actual pilot evidence: persistent optional X access, a LoyalFans/Fanvue integration, agency dashboards, or paid subscriptions. None will be built before the pilot identifies the binding constraint.
