import { useState } from 'react';
import type { Experiment, ExperimentOutcome } from '@creator-copilot/shared';
import { Icon } from './Icon';

type ExperimentsViewProps = {
  experiment: Experiment;
  onCheckIn: (outcome: ExperimentOutcome, note: string) => void;
};

export function ExperimentsView({ experiment, onCheckIn }: ExperimentsViewProps) {
  const [outcome, setOutcome] = useState<ExperimentOutcome>('flat');
  const [note, setNote] = useState('');
  const [saved, setSaved] = useState(false);

  function save() {
    onCheckIn(outcome, note);
    setNote('');
    setSaved(true);
  }

  return (
    <section>
      <div className="view-heading compact-heading">
        <div>
          <p className="soft-label">One variable at a time</p>
          <h1>{experiment.title}</h1>
          <p>{experiment.hypothesis}</p>
        </div>
        <span className="active-chip">Active</span>
      </div>

      <div className="experiment-board">
        <div className="experiment-steps">
          <h2>This week’s method</h2>
          <ol>
            {experiment.instructions.map((instruction, index) => (
              <li key={instruction}><span>{index + 1}</span><p>{instruction}</p></li>
            ))}
          </ol>
          <div className="metric-callout"><Icon name="insight" size={20} /><div><strong>Measure</strong><p>{experiment.metric}</p></div></div>
        </div>

        <div className="check-in-panel">
          <div><span>Weekly check-in</span><strong>{experiment.checkIns.length} recorded</strong></div>
          <fieldset>
            <legend>What changed?</legend>
            <div className="outcome-picker">
              {(['up', 'flat', 'down'] as const).map((value) => (
                <label key={value} className={outcome === value ? 'is-selected' : ''}>
                  <input
                    type="radio"
                    name="outcome"
                    value={value}
                    checked={outcome === value}
                    onChange={() => { setOutcome(value); setSaved(false); }}
                  />
                  {value === 'up' ? 'Improved' : value === 'flat' ? 'No change' : 'Declined'}
                </label>
              ))}
            </div>
          </fieldset>
          <label>
            What did you notice?
            <textarea value={note} onChange={(event) => { setNote(event.target.value); setSaved(false); }} rows={4} placeholder="Useful replies increased when…" />
          </label>
          <button type="button" className="primary-button" onClick={save}>Save check-in</button>
          {saved ? <p className="success-note" role="status"><Icon name="check" size={16} /> Check-in saved locally.</p> : null}
        </div>
      </div>
    </section>
  );
}
