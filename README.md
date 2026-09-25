# Creator Copilot

Creator Copilot is a creator-controlled Chrome sidebar for planning public X content. It reads a minimal public-page context only after an explicit request, shows the detected context for confirmation, and creates drafts that the creator can review and copy herself.

The current release is a local MVP. It includes onboarding, Today, Analyze, Create, Experiments, Settings, local storage, safety rules, and a deterministic local recommendation provider. It does not include cloud accounts, paid AI calls, automatic posting, or private-message access.

## Install the local MVP

Requirements: Chrome 114 or newer and Node.js 22.

```powershell
git clone https://github.com/popcorntoocold/creator-copilot.git
cd creator-copilot
npm install
npm run package
```

Then open `chrome://extensions`, enable **Developer mode**, click **Load unpacked**, and select `apps/extension/dist`.

For the exact first-use walkthrough and update process, see [docs/INSTALL.md](docs/INSTALL.md).

## Development checks

```powershell
npm test
npm run typecheck
npm run build
npm run package
```

`npm run package` writes `release/creator-copilot-extension.zip` and verifies that the archive contains no source maps, test fixtures, environment files, or persistent host permissions.

## Privacy model

- Permissions: `sidePanel`, `storage`, `activeTab`, and `scripting` only.
- No persistent host permission and no `<all_urls>` access.
- Direct-message routes fail closed before the page DOM is read.
- Raw page context stays in the active sidebar session and is excluded from persisted state.
- Copying is explicit. The extension does not post, reply, follow, like, purchase, or change account settings.
