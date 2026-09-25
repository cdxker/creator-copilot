export type PageType = 'profile' | 'post' | 'feed';

export type PageMetrics = {
  replies?: number;
  reposts?: number;
  likes?: number;
  views?: number;
};

export type PageContext = {
  version: 1;
  source: 'x';
  pageType: PageType;
  url: string;
  handle?: string;
  displayName?: string;
  text: string;
  metrics: PageMetrics;
};

export type CreatorProfile = {
  handle: string;
  displayName: string;
  voice: string;
  allowedTopics: string;
  prohibitedTopics: string;
  contentFrequency: string;
  preferredFormats: string[];
  monetizationDestination: string;
  weeklyGoal: string;
  consentAccepted: boolean;
};

export type RecommendationKind = 'hook' | 'reply' | 'follow_up' | 'boundary';
export type RecommendationStatus = 'ready' | 'completed' | 'dismissed';

export type Recommendation = {
  id: string;
  kind: RecommendationKind;
  title: string;
  rationale: string;
  draft: string;
  copyable: boolean;
  requiresReview: true;
  status: RecommendationStatus;
};

export type ExperimentOutcome = 'up' | 'flat' | 'down';

export type ExperimentCheckIn = {
  at: string;
  outcome: ExperimentOutcome;
  note: string;
};

export type Experiment = {
  id: string;
  title: string;
  hypothesis: string;
  instructions: string[];
  metric: string;
  status: 'active' | 'complete';
  checkIns: ExperimentCheckIn[];
};
