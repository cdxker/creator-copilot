import type { CreatorProfile, PageContext, Recommendation } from './models';
import { classifySafety, conflictsWithCreatorBoundaries } from './policy';

function clip(value: string, length = 500): string {
  return value.trim().replace(/\s+/g, ' ').slice(0, length);
}

function makeRecommendation(
  id: string,
  kind: Recommendation['kind'],
  title: string,
  rationale: string,
  draft: string,
): Recommendation {
  return {
    id,
    kind,
    title,
    rationale,
    draft: clip(draft),
    copyable: true,
    requiresReview: true,
    status: 'ready',
  };
}

function boundaryRecommendation(pageType: PageContext['pageType'], rationale: string): Recommendation[] {
  return [
    {
      id: `boundary-${pageType}`,
      kind: 'boundary',
      title: 'Keep this one inside your boundaries',
      rationale,
      draft: 'Review the page yourself or move to a different public post.',
      copyable: false,
      requiresReview: true,
      status: 'ready',
    },
  ];
}

export function createRecommendations(
  context: PageContext,
  profile: CreatorProfile,
): Recommendation[] {
  const generationInputs = [
    context.text,
    profile.voice,
    profile.allowedTopics,
    profile.monetizationDestination,
  ].join(' ');
  const safety = classifySafety(generationInputs);

  if (!safety.safe) {
    return boundaryRecommendation(
      context.pageType,
      `The selected context matched the ${safety.category.replaceAll('_', ' ')} safety rule. No draft was created.`,
    );
  }

  if (conflictsWithCreatorBoundaries(generationInputs, profile.prohibitedTopics)) {
    return boundaryRecommendation(
      context.pageType,
      'The selected context conflicts with a creator-configured boundary. No draft was created.',
    );
  }

  const destination = clip(profile.monetizationDestination, 80) || 'your verified creator page';
  const pageNoun = context.pageType === 'profile' ? 'profile' : context.pageType === 'feed' ? 'feed theme' : 'post';
  const recommendations = [
    makeRecommendation(
      `${context.pageType}-hook`,
      'hook',
      'Turn the premise into a sharper opener',
      'A specific contrast gives readers a reason to stop without changing your voice.',
      `A clearer standard for this ${pageNoun}: attention is easy to ask for; intention is harder to fake.`,
    ),
    makeRecommendation(
      `${context.pageType}-reply`,
      'reply',
      'Invite a real response',
      'An open question helps you learn who is paying attention without promising access.',
      `What detail in this ${pageNoun} earned your attention? Be specific.`,
    ),
    makeRecommendation(
      `${context.pageType}-follow-up`,
      'follow_up',
      'Publish the next step',
      `Connect the theme to ${destination} with a clear, optional next action.`,
      `A follow-up for the people who understood the assignment: I’m expanding on this at ${destination}. Read the details before you decide whether it fits you.`,
    ),
  ];

  const completedOutput = recommendations.map((item) => item.draft).join(' ');
  if (
    !classifySafety(completedOutput).safe ||
    conflictsWithCreatorBoundaries(completedOutput, profile.prohibitedTopics)
  ) {
    return boundaryRecommendation(
      context.pageType,
      'A generated draft conflicted with a safety rule or creator boundary. No draft was kept.',
    );
  }

  return recommendations;
}
