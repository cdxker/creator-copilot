import { defineManifest } from '@crxjs/vite-plugin';

export default defineManifest({
  manifest_version: 3,
  name: 'Creator Copilot',
  short_name: 'Copilot',
  version: '0.1.0',
  description: 'A creator-controlled planning sidebar for public X pages.',
  minimum_chrome_version: '114',
  permissions: ['sidePanel', 'storage', 'activeTab', 'scripting'],
  action: {
    default_title: 'Open Creator Copilot',
  },
  side_panel: {
    default_path: 'index.html',
  },
  background: {
    service_worker: 'src/background.ts',
    type: 'module',
  },
});
