import type { Recommendation } from '@creator-copilot/shared';
import { Icon } from './Icon';
import { RecommendationCard } from './RecommendationCard';

type CreateViewProps = {
  recommendations: Recommendation[];
  onComplete: (id: string) => void;
  onDismiss: (id: string) => void;
  onAnalyze: () => void;
};

export function CreateView({ recommendations, onComplete, onDismiss, onAnalyze }: CreateViewProps) {
  const drafts = recommendations.filter((item) => item.copyable && item.status !== 'dismissed');

  return (
    <section>
      <div className="view-heading compact-heading">
        <div>
          <p className="soft-label">Draft room</p>
          <h1>Keep your voice. Lose the blank page.</h1>
          <p>Every line below is a starting point. Review it before it leaves this studio.</p>
        </div>
      </div>

      {drafts.length ? (
        <div className="recommendation-stack">
          {drafts.map((item) => (
            <RecommendationCard
              key={item.id}
              recommendation={item}
              onComplete={onComplete}
              onDismiss={onDismiss}
            />
          ))}
        </div>
      ) : (
        <div className="empty-view">
          <span className="feature-icon"><Icon name="create" size={24} /></span>
          <h2>Your next drafts begin with context.</h2>
          <p>Analyze one public X post or profile to create a hook, reply, and follow-up.</p>
          <button type="button" className="primary-button" onClick={onAnalyze}>Choose a page to analyze</button>
        </div>
      )}
    </section>
  );
}
