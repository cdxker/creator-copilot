import { AuthService } from './auth';
import { D1AuthStore } from './db';
import { parseEnv, type Env } from './env';
import { createRouter } from './router';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const config = parseEnv(env);
    const auth = new AuthService({
      store: new D1AuthStore(env.DB),
      signingSecret: config.signingSecret,
      dailyLimit: config.dailyAnalysisLimit,
    });
    return createRouter({ allowedOrigins: config.allowedOrigins, auth }).fetch(request);
  },
} satisfies ExportedHandler<Env>;
