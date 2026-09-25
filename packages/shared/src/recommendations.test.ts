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

  it('does not echo financially unsafe source text into drafts', () => {
    const result = createRecommendations(
      { ...postContext, text: 'Borrow cash to pay me' },
      profile,
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ kind: 'boundary', copyable: false });
    expect(JSON.stringify(result)).not.toContain('Borrow cash to pay me');
  });

  it('blocks an unsafe monetization destination', () => {
    const result = createRecommendations(postContext, {
      ...profile,
      monetizationDestination: 'max out your credit card',
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ kind: 'boundary', copyable: false });
    expect(JSON.stringify(result)).not.toMatch(/credit card/i);
  });

  it('applies creator prohibited topics to page content', () => {
    const result = createRecommendations(
      { ...postContext, text: 'My thoughts on politics and creators' },
      { ...profile, prohibitedTopics: 'politics, threats' },
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ kind: 'boundary', copyable: false });
  });

  it('treats prohibition wording as a constraint rather than unsafe source content', () => {
    const result = createRecommendations(
      postContext,
      { ...profile, prohibitedTopics: 'No blackmail, no doxxing' },
    );

    expect(result).toHaveLength(3);
  });

  it('never persists a verbatim source sentinel in generated output', () => {
    const sentinel = 'UNIQUE_SOURCE_SENTINEL_48291';
    const result = createRecommendations({ ...postContext, text: sentinel }, profile);

    expect(result).toHaveLength(3);
    expect(JSON.stringify(result)).not.toContain(sentinel);
  });
});
