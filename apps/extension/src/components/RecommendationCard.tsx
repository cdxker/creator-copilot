import { useState } from 'react';
import type { Recommendation } from '@creator-copilot/shared';
import { copyDraft } from '../lib/clipboard';
import { Icon } from './Icon';

type RecommendationCardProps = {
  recommendation: Recommendation;
  onComplete: (id: string) => void;
  onDismiss: (id: string) => void;
  compact?: boolean;
};

export function RecommendationCard({
  recommendation,
  onComplete,
  onDismiss,
  compact = false,
}: RecommendationCardProps) {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');

  async function copy() {
    try {
      await copyDraft(recommendation.draft);
      setCopyState('copied');
    } catch {
      setCopyState('failed');
    }
  }

  return (
    <article className={`recommendation-card kind-${recommendation.kind}${compact ? ' is-compact' : ''}`}>
      <div className="recommendation-heading">
        <span className="recommendation-kind">{recommendation.kind.replace('_', ' ')}</span>
        {recommendation.status !== 'ready' ? (
          <span className={`status-chip status-${recommendation.status}`}>{recommendation.status}</span>
        ) : null}
      </div>
      <h3>{recommendation.title}</h3>
      <p className="rationale">{recommendation.rationale}</p>
      <blockquote>{recommendation.draft}</blockquote>
      {recommendation.status === 'ready' ? (
        <div className="card-actions">
          {recommendation.copyable ? (
            <button type="button" className="secondary-button" onClick={copy}>
              <Icon name={copyState === 'copied' ? 'check' : 'clipboard'} size={16} />
              {copyState === 'copied' ? 'Copied' : copyState === 'failed' ? 'Copy failed' : 'Copy draft'}
            </button>
          ) : null}
          <button type="button" className="quiet-button" onClick={() => onComplete(recommendation.id)}>
            <Icon name="check" size={16} /> Complete
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label={`Dismiss ${recommendation.title}`}
            onClick={() => onDismiss(recommendation.id)}
          >
            <Icon name="dismiss" size={16} />
          </button>
        </div>
      ) : null}
    </article>
  );
}
