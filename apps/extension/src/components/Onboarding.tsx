import { useState, type FormEvent } from 'react';
import type { CreatorProfile } from '@creator-copilot/shared';
import { Icon } from './Icon';

type OnboardingProps = {
  onSave: (profile: CreatorProfile) => void;
};

const emptyProfile: CreatorProfile = {
  handle: '',
  displayName: '',
  voice: '',
  allowedTopics: '',
  prohibitedTopics: '',
  contentFrequency: 'Daily',
  preferredFormats: ['Post', 'Reply'],
  monetizationDestination: '',
  weeklyGoal: '',
  consentAccepted: false,
};

export function Onboarding({ onSave }: OnboardingProps) {
  const [profile, setProfile] = useState(emptyProfile);
  const [error, setError] = useState('');

  function update<K extends keyof CreatorProfile>(key: K, value: CreatorProfile[K]) {
    setProfile((current) => ({ ...current, [key]: value }));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile.consentAccepted) {
      setError('Confirm the privacy disclosure before saving your studio.');
      return;
    }
    if (!profile.handle.trim() || !profile.displayName.trim() || !profile.voice.trim()) {
      setError('Add your public handle, creator name, and voice notes.');
      return;
    }
    setError('');
    onSave({
      ...profile,
      handle: profile.handle.startsWith('@') ? profile.handle : `@${profile.handle}`,
    });
  }

  return (
    <div className="onboarding-page">
      <div className="onboarding-intro">
        <span className="intro-seal"><Icon name="feather" size={24} /></span>
        <h1>Make the next move feel intentional.</h1>
        <p>
          Set your voice and boundaries once. Copilot turns the public X page you choose into
          drafts you review, edit, and publish yourself.
        </p>
        <ul className="trust-list">
          <li><Icon name="check" size={16} /> No DMs or hidden data</li>
          <li><Icon name="check" size={16} /> No automatic posting</li>
          <li><Icon name="check" size={16} /> Your boundaries stay visible</li>
        </ul>
      </div>

      <form className="onboarding-form" onSubmit={submit}>
        <div className="form-heading">
          <p>Build your studio profile</p>
          <span>About 2 minutes</span>
        </div>

        <div className="field-grid two-columns">
          <label>
            Public X handle
            <input
              value={profile.handle}
              onChange={(event) => update('handle', event.target.value)}
              placeholder="@yourhandle"
              autoComplete="off"
            />
          </label>
          <label>
            Creator name
            <input
              value={profile.displayName}
              onChange={(event) => update('displayName', event.target.value)}
              placeholder="Your public name"
              autoComplete="off"
            />
          </label>
        </div>

        <label>
          How should your writing sound?
          <textarea
            value={profile.voice}
            onChange={(event) => update('voice', event.target.value)}
            placeholder="Confident, concise, teasing but never cruel…"
            rows={3}
          />
        </label>

        <div className="field-grid two-columns">
          <label>
            Topics you welcome
            <textarea
              value={profile.allowedTopics}
              onChange={(event) => update('allowedTopics', event.target.value)}
              placeholder="Luxury, routines, playful challenges"
              rows={3}
            />
          </label>
          <label>
            Hard boundaries
            <textarea
              value={profile.prohibitedTopics}
              onChange={(event) => update('prohibitedTopics', event.target.value)}
              placeholder="Debt, threats, private information"
              rows={3}
            />
          </label>
        </div>

        <label>
          Primary destination
          <input
            value={profile.monetizationDestination}
            onChange={(event) => update('monetizationDestination', event.target.value)}
            placeholder="Your verified creator page"
          />
        </label>

        <label>
          This week’s business goal
          <input
            value={profile.weeklyGoal}
            onChange={(event) => update('weeklyGoal', event.target.value)}
            placeholder="Start 10 qualified conversations"
          />
        </label>

        <label className="consent-row">
          <input
            type="checkbox"
            checked={profile.consentAccepted}
            onChange={(event) => update('consentAccepted', event.target.checked)}
          />
          <span>
            I understand analysis is user initiated, limited to the public X page I choose,
            and remains local in this pilot.
          </span>
        </label>

        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <button className="primary-button" type="submit">
          Save and enter studio
          <Icon name="sparkle" size={17} />
        </button>
      </form>
    </div>
  );
}
