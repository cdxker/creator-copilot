import type { AnalysisPayload, AnalysisRequest } from '@creator-copilot/shared';

export interface AnalysisProvider {
  analyze(request: AnalysisRequest): Promise<AnalysisPayload | unknown>;
}
