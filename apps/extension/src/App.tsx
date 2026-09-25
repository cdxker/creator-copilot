import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CreatorProfile, ExperimentOutcome, PageContext, Recommendation } from '@creator-copilot/shared';
import { AppShell, type ViewName } from './components/AppShell';
import { AnalyzeView } from './components/AnalyzeView';
import { CreateView } from './components/CreateView';
import { ExperimentsView } from './components/ExperimentsView';
import { Onboarding } from './components/Onboarding';
import { SettingsView } from './components/SettingsView';
import { TodayView } from './components/TodayView';
import { requestPageContext as defaultRequestPageContext, type ClientExtractionResult } from './lib/chromeClient';
import { initialCreatorState, type CreatorState } from './state/defaults';
import { creatorReducer, type CreatorAction } from './state/reducer';
import { clearPersistentState, loadPersistentState, savePersistentState } from './state/store';

type AppProps = {
  initialState?: CreatorState;
  requestPageContext?: () => Promise<ClientExtractionResult>;
};

export function App({
  initialState,
  requestPageContext = defaultRequestPageContext,
}: AppProps) {
  const [state, setState] = useState<CreatorState>(initialState ?? initialCreatorState);
  const [loaded, setLoaded] = useState(initialState !== undefined);
  const [activeView, setActiveView] = useState<ViewName>('today');

  const dispatch = useCallback((action: CreatorAction) => {
    setState((current) => creatorReducer(current, action));
  }, []);

  useEffect(() => {
    if (initialState !== undefined) return;
    void loadPersistentState().then((stored) => {
      setState(stored);
      setLoaded(true);
    });
  }, [initialState]);

  useEffect(() => {
    if (!loaded) return;
    void savePersistentState(state);
  }, [loaded, state]);

  const completed = useMemo(
    () => state.recommendations.filter((item) => item.status === 'completed').length,
    [state.recommendations],
  );

  const saveProfile = useCallback(
    (profile: CreatorProfile) => dispatch({ type: 'save_profile', profile }),
    [dispatch],
  );
  const setRecommendations = useCallback(
    (recommendations: Recommendation[]) =>
      dispatch({ type: 'set_recommendations', recommendations }),
    [dispatch],
  );
  const setContext = useCallback(
    (context: PageContext | null) => dispatch({ type: 'set_session_context', context }),
    [dispatch],
  );
  const complete = useCallback(
    (id: string) => dispatch({ type: 'complete_recommendation', id }),
    [dispatch],
  );
  const dismiss = useCallback(
    (id: string) => dispatch({ type: 'dismiss_recommendation', id }),
    [dispatch],
  );
  const checkIn = useCallback(
    (outcome: ExperimentOutcome, note: string) =>
      dispatch({ type: 'check_in_experiment', outcome, note }),
    [dispatch],
  );

  async function deleteData() {
    await clearPersistentState();
    dispatch({ type: 'delete_local_data' });
    setActiveView('today');
  }

  if (!loaded) {
    return (
      <div className="loading-screen" aria-live="polite">
        <span className="loading-mark" />
        <p>Opening your studio…</p>
      </div>
    );
  }

  if (!state.profile) {
    return <Onboarding onSave={saveProfile} />;
  }

  return (
    <AppShell activeView={activeView} onNavigate={setActiveView} completed={completed}>
      {activeView === 'today' ? (
        <TodayView
          profile={state.profile}
          recommendations={state.recommendations}
          onComplete={complete}
          onDismiss={dismiss}
          onAnalyze={() => setActiveView('analyze')}
        />
      ) : null}
      {activeView === 'analyze' ? (
        <AnalyzeView
          profile={state.profile}
          recommendations={state.recommendations}
          requestContext={requestPageContext}
          onContext={setContext}
          onRecommendations={setRecommendations}
          onComplete={complete}
          onDismiss={dismiss}
        />
      ) : null}
      {activeView === 'create' ? (
        <CreateView
          recommendations={state.recommendations}
          onComplete={complete}
          onDismiss={dismiss}
          onAnalyze={() => setActiveView('analyze')}
        />
      ) : null}
      {activeView === 'experiments' ? (
        <ExperimentsView experiment={state.experiment} onCheckIn={checkIn} />
      ) : null}
      {activeView === 'settings' ? (
        <SettingsView profile={state.profile} onSave={saveProfile} onDelete={() => void deleteData()} />
      ) : null}
    </AppShell>
  );
}
