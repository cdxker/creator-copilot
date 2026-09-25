import type { CreatorProfile, ExperimentOutcome, Recommendation } from '@creator-copilot/shared';
import { initialCreatorState, type CreatorState } from './defaults';

export type CreatorAction =
  | { type: 'save_profile'; profile: CreatorProfile }
  | { type: 'set_recommendations'; recommendations: Recommendation[] }
  | { type: 'complete_recommendation'; id: string }
  | { type: 'dismiss_recommendation'; id: string }
  | { type: 'set_session_context'; context: CreatorState['sessionContext'] }
  | { type: 'check_in_experiment'; outcome: ExperimentOutcome; note: string }
  | { type: 'delete_local_data' };

export function creatorReducer(state: CreatorState, action: CreatorAction): CreatorState {
  switch (action.type) {
    case 'save_profile':
      return { ...state, profile: action.profile };
    case 'set_recommendations':
      return { ...state, recommendations: action.recommendations };
    case 'complete_recommendation':
      return {
        ...state,
        recommendations: state.recommendations.map((item) =>
          item.id === action.id ? { ...item, status: 'completed' } : item,
        ),
      };
    case 'dismiss_recommendation':
      return {
        ...state,
        recommendations: state.recommendations.map((item) =>
          item.id === action.id ? { ...item, status: 'dismissed' } : item,
        ),
      };
    case 'set_session_context':
      return { ...state, sessionContext: action.context };
    case 'check_in_experiment':
      return {
        ...state,
        experiment: {
          ...state.experiment,
          checkIns: [
            ...state.experiment.checkIns,
            { at: new Date().toISOString(), outcome: action.outcome, note: action.note.trim() },
          ],
        },
      };
    case 'delete_local_data':
      return initialCreatorState;
  }
}
