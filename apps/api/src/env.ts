export type Env = {
  DB: D1Database;
  ENVIRONMENT: 'development' | 'production' | 'test';
  PROVIDER: 'fake' | 'openai';
  ALLOWED_EXTENSION_ORIGINS: string;
  DAILY_ANALYSIS_LIMIT: string;
  SESSION_SIGNING_SECRET: string;
};

export type RuntimeConfig = {
  environment: Env['ENVIRONMENT'];
  provider: Env['PROVIDER'];
  allowedOrigins: Set<string>;
  dailyAnalysisLimit: number;
  signingSecret: string;
};

export function parseEnv(env: Env): RuntimeConfig {
  const allowedOrigins = new Set(
    env.ALLOWED_EXTENSION_ORIGINS.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  );
  const dailyAnalysisLimit = Number.parseInt(env.DAILY_ANALYSIS_LIMIT, 10);

  if (allowedOrigins.size === 0) throw new Error('At least one allowed extension origin is required.');
  if (!Number.isSafeInteger(dailyAnalysisLimit) || dailyAnalysisLimit < 1 || dailyAnalysisLimit > 100) {
    throw new Error('DAILY_ANALYSIS_LIMIT must be an integer from 1 through 100.');
  }
  if (
    env.ENVIRONMENT === 'production' &&
    [...allowedOrigins].some((origin) => origin.includes('REPLACE_') || !origin.startsWith('chrome-extension://'))
  ) {
    throw new Error('Production requires a concrete chrome-extension:// origin.');
  }
  if (new TextEncoder().encode(env.SESSION_SIGNING_SECRET).byteLength < 32) {
    throw new Error('SESSION_SIGNING_SECRET must be at least 32 bytes.');
  }

  return {
    environment: env.ENVIRONMENT,
    provider: env.PROVIDER,
    allowedOrigins,
    dailyAnalysisLimit,
    signingSecret: env.SESSION_SIGNING_SECRET,
  };
}
