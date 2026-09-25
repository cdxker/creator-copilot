import { parseEnv, type Env } from './env';
import { createRouter } from './router';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const config = parseEnv(env);
    return createRouter({ allowedOrigins: config.allowedOrigins }).fetch(request);
  },
} satisfies ExportedHandler<Env>;
