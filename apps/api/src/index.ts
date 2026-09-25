import { AuthService } from './auth';
import { AnalysisService } from './analysis';
import { D1AuthStore } from './db';
import { parseEnv, type Env } from './env';
import { D1UsageStore, QuotaService } from './quota';
import { FakeAnalysisProvider } from './providers/fake';
import { createRouter } from './router';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const config = parseEnv(env);
    const auth = new AuthService({
      store: new D1AuthStore(env.DB),
      signingSecret: config.signingSecret,
      dailyLimit: config.dailyAnalysisLimit,
    });
    if (config.provider !== 'fake') {
      throw new Error('The configured analysis provider is not available in this build.');
    }
    const quota = new QuotaService({
      store: new D1UsageStore(env.DB),
      dailyLimit: config.dailyAnalysisLimit,
      networkLimit: config.networkDailyLimit,
      networkSalt: config.networkHashSalt,
    });
    const analysis = new AnalysisService({
      authenticator: auth,
      quota,
      provider: new FakeAnalysisProvider(),
    });
    return createRouter({ allowedOrigins: config.allowedOrigins, auth, analysis }).fetch(request);
  },
} satisfies ExportedHandler<Env>;
