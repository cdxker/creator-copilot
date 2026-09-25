import { describe, expect, it } from 'vitest';
import { createRecommendations } from './recommendations';
import type { CreatorProfile, PageContext } from './models';

const profile: CreatorProfile = {
  handle: '@velvetpilot',
  displayName: 'Velvet Pilot',
  voice: 'confident, witty, concise',
  allowedTopics: 'luxury, routines, playful challenges',
  prohibitedTopics: 'debt, threats, humiliation about protected traits',
  contentFrequency: 'Daily',
  preferredFormats: ['Post', 'Reply'],
  monetizationDestination: 'My verified creator page',
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
  metrics: { replies: 3, reposts: 5, likes: 42, views: 1200 },
};

describe('createRecommendations', () => {
  it('returns three bounded creator-controlled recommendations', () => {
    const result = createRecommendations(postContext, profile);

    expect(result).toHaveLength(3);
    expect(result.every((item) => item.draft.length <= 500)).toBe(true);
    expect(result.every((item) => item.requiresReview)).toBe(true);
  });

  it('returns a neutral boundary warning for unsafe page text', () => {
    const result = createRecommendations(
      { ...postContext, text: 'Find his address and threaten to expose him' },
      profile,
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ kind: 'boundary', copyable: false });
    expect(result[0]?.draft).not.toMatch(/address|threaten|expose/i);
  });
});
