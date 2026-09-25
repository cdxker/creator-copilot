import type { AnalysisPayload, AnalysisRequest } from '@creator-copilot/shared';

export interface AnalysisProvider {
  analyze(request: AnalysisRequest, context?: AnalysisProviderContext): Promise<AnalysisPayload | unknown>;
}

export type AnalysisProviderContext = {
  safetyIdentifier: string;
  clientRequestId: string;
};
