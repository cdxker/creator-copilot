import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CreatorProfile, PageContext } from '@creator-copilot/shared';
import { App } from './App';
import { initialCreatorState } from './state/defaults';

const profile: CreatorProfile = {
  handle: '@velvetpilot',
  displayName: 'Velvet Pilot',
  voice: 'confident, witty, concise',
  allowedTopics: 'luxury, routines, playful challenges',
  prohibitedTopics: 'debt, threats, protected traits',
  contentFrequency: 'Daily',
  preferredFormats: ['Post', 'Reply'],
  monetizationDestination: 'my verified creator page',
  weeklyGoal: 'Start 10 qualified conversations',
  consentAccepted: true,
};

const postContext: PageContext = {
  version: 1,
  source: 'x',
  pageType: 'post',
  url: 'https://x.com/velvetpilot/status/123',
  handle: '@velvetpilot',
  displayName: 'Velvet Pilot',
  text: 'Quiet luxury is a standard, not a trend.',
  metrics: { likes: 42, views: 1200 },
};

afterEach(() => cleanup());

describe('App', () => {
  it('requires consent before saving onboarding', async () => {
    const user = userEvent.setup();
    render(<App initialState={initialCreatorState} />);

    await user.click(screen.getByRole('button', { name: /save and enter/i }));

    expect(screen.getByText(/confirm the privacy disclosure/i)).toBeVisible();
  });

  it('previews extracted context before creating drafts', async () => {
    const user = userEvent.setup();
    const requestPageContext = vi.fn().mockResolvedValue({ ok: true, context: postContext });
    render(
      <App
        initialState={{ ...initialCreatorState, profile }}
        requestPageContext={requestPageContext}
      />,
    );

    await user.click(screen.getByRole('button', { name: /^analyze$/i }));
    await user.click(screen.getByRole('button', { name: /analyze this page/i }));

    expect(await screen.findByText(postContext.text)).toBeVisible();
    expect(screen.getByRole('button', { name: /confirm and create recommendations/i })).toBeVisible();
    expect(screen.queryByText(/turn the premise into a sharper opener/i)).not.toBeInTheDocument();
  });

  it('creates drafts only after confirmation', async () => {
    const user = userEvent.setup();
    render(
      <App
        initialState={{ ...initialCreatorState, profile }}
        requestPageContext={vi.fn().mockResolvedValue({ ok: true, context: postContext })}
      />,
    );

    await user.click(screen.getByRole('button', { name: /^analyze$/i }));
    await user.click(screen.getByRole('button', { name: /analyze this page/i }));
    await user.click(
      await screen.findByRole('button', { name: /confirm and create recommendations/i }),
    );

    expect(screen.getByText(/turn the premise into a sharper opener/i)).toBeVisible();
  });
});
