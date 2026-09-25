import type { CreatorProfile, PageContext, Recommendation } from './models';
import { classifySafety } from './policy';

function clip(value: string, length = 500): string {
  return value.trim().replace(/\s+/g, ' ').slice(0, length);
}

function subject(context: PageContext): string {
  const cleaned = clip(context.text, 120);
  return cleaned || 'the idea already getting attention';
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

export function createRecommendations(
  context: PageContext,
  profile: CreatorProfile,
): Recommendation[] {
  const safety = classifySafety(
    [context.text, profile.voice, profile.allowedTopics, profile.prohibitedTopics].join(' '),
  );

  if (!safety.safe) {
    return [
      {
        id: `boundary-${context.pageType}`,
        kind: 'boundary',
        title: 'Keep this one inside your boundaries',
        rationale: `This page matched the ${safety.category.replaceAll('_', ' ')} safety rule. No draft was created.`,
        draft: 'Review the page yourself or move to a different public post.',
        copyable: false,
        requiresReview: true,
        status: 'ready',
      },
    ];
  }

  const destination = clip(profile.monetizationDestination, 80) || 'your verified creator page';
  const pageSubject = subject(context);

  return [
    makeRecommendation(
      `${context.pageType}-hook`,
      'hook',
      'Turn the premise into a sharper opener',
      'A specific contrast gives readers a reason to stop without changing your voice.',
      `You can tell who understands standards by how they respond to this: ${pageSubject}`,
    ),
    makeRecommendation(
      `${context.pageType}-reply`,
      'reply',
      'Invite a real response',
      'An open question helps you learn who is paying attention without promising access.',
      `What part of “${pageSubject}” landed for you? Be specific.`,
    ),
    makeRecommendation(
      `${context.pageType}-follow-up`,
      'follow_up',
      'Publish the next step',
      `Connect the theme to ${destination} with a clear, optional next action.`,
      `A follow-up for the people who understood the assignment: I’m expanding on this at ${destination}. Read the details before you decide whether it fits you.`,
    ),
  ];
}
