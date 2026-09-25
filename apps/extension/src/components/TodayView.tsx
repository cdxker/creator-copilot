import type { CreatorProfile, Recommendation } from '@creator-copilot/shared';
import { Icon } from './Icon';
import { RecommendationCard } from './RecommendationCard';

type TodayViewProps = {
  profile: CreatorProfile;
  recommendations: Recommendation[];
  onComplete: (id: string) => void;
  onDismiss: (id: string) => void;
  onAnalyze: () => void;
};

export function TodayView({
  profile,
  recommendations,
  onComplete,
  onDismiss,
  onAnalyze,
}: TodayViewProps) {
  const ready = recommendations.filter((item) => item.status === 'ready').slice(0, 3);

  return (
    <section>
      <div className="view-heading">
        <div>
          <p className="soft-label">Today’s studio</p>
          <h1>Good evening, {profile.displayName}.</h1>
          <p>Your goal: {profile.weeklyGoal || 'Choose one useful action and complete it.'}</p>
        </div>
        <span className="date-stamp">
          {new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date())}
        </span>
      </div>

      {ready.length ? (
        <div className="recommendation-stack">
          {ready.map((item) => (
            <RecommendationCard
              key={item.id}
              recommendation={item}
              onComplete={onComplete}
              onDismiss={onDismiss}
              compact
            />
          ))}
        </div>
      ) : (
        <div className="empty-plan">
          <div className="empty-plan-copy">
            <span className="feature-icon"><Icon name="compass" size={22} /></span>
            <h2>Start with the page already in front of you.</h2>
            <p>
              Open a public profile or post on X. Copilot will show you exactly what it detected
              before creating any draft.
            </p>
            <button className="primary-button" type="button" onClick={onAnalyze}>
              Analyze a public page <Icon name="analyze" size={17} />
            </button>
          </div>
          <ol className="starter-sequence">
            <li><span>1</span><div><strong>Choose</strong><p>Open a public X page worth studying.</p></div></li>
            <li><span>2</span><div><strong>Confirm</strong><p>Review the minimal context before analysis.</p></div></li>
            <li><span>3</span><div><strong>Act</strong><p>Edit, copy, or dismiss every suggestion yourself.</p></div></li>
          </ol>
        </div>
      )}

      <div className="studio-note">
        <Icon name="sparkle" size={18} />
        <div><strong>Studio rule</strong><p>Specific beats louder. Make one clean move, then measure it.</p></div>
      </div>
    </section>
  );
}
