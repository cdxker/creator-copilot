import type { Quota } from './types';

export type Clock = () => Date;

export interface UsageStore {
  chargeSession(sessionId: string, day: string, networkHash: string, limit: number): Promise<number | null>;
  chargeNetwork(networkHash: string, day: string, limit: number): Promise<number | null>;
}

export type QuotaChargeResult =
  | { ok: true; quota: Quota }
  | { ok: false; reason: 'session_limit' | 'network_limit'; resetsAt: string; quotaConsumed?: boolean };

const encoder = new TextEncoder();

function bytesToHex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function hashNetworkIdentifier(identifier: string, salt: string, day: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(`${salt}:${day}:${identifier || 'unknown'}`));
  return bytesToHex(new Uint8Array(digest));
}

function dayAndReset(now: Date): { day: string; resetsAt: string } {
  const day = now.toISOString().slice(0, 10);
  const resetsAt = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
  ).toISOString();
  return { day, resetsAt };
}

export class QuotaService {
  constructor(
    private readonly options: {
      store: UsageStore;
      dailyLimit: number;
      networkLimit: number;
      networkSalt: string;
      clock?: Clock;
    },
  ) {
    if (new TextEncoder().encode(options.networkSalt).byteLength < 16) {
      throw new Error('NETWORK_HASH_SALT must be at least 16 bytes.');
    }
  }

  async charge(sessionId: string, networkIdentifier: string): Promise<QuotaChargeResult> {
    const now = (this.options.clock ?? (() => new Date()))();
    const { day, resetsAt } = dayAndReset(now);
    const networkHash = await hashNetworkIdentifier(
      networkIdentifier,
      this.options.networkSalt,
      day,
    );
    const sessionCount = await this.options.store.chargeSession(
      sessionId,
      day,
      networkHash,
      this.options.dailyLimit,
    );
    if (sessionCount === null) return { ok: false, reason: 'session_limit', resetsAt };

    const networkCount = await this.options.store.chargeNetwork(
      networkHash,
      day,
      this.options.networkLimit,
    );
    if (networkCount === null) {
      return { ok: false, reason: 'network_limit', resetsAt, quotaConsumed: true };
    }

    return {
      ok: true,
      quota: {
        remaining: this.options.dailyLimit - sessionCount,
        limit: this.options.dailyLimit,
        resetsAt,
      },
    };
  }
}

export class D1UsageStore implements UsageStore {
  constructor(private readonly database: D1Database) {}

  async chargeSession(
    sessionId: string,
    day: string,
    networkHash: string,
    limit: number,
  ): Promise<number | null> {
    const row = await this.database
      .prepare(
        `INSERT INTO daily_usage (session_id, day, network_hash, count)
         VALUES (?, ?, ?, 1)
         ON CONFLICT(session_id, day) DO UPDATE
         SET count = count + 1, network_hash = excluded.network_hash
         WHERE count < ?
         RETURNING count`,
      )
      .bind(sessionId, day, networkHash, limit)
      .first<{ count: number }>();
    return row?.count ?? null;
  }

  async chargeNetwork(networkHash: string, day: string, limit: number): Promise<number | null> {
    const row = await this.database
      .prepare(
        `INSERT INTO daily_network_usage (network_hash, day, count)
         VALUES (?, ?, 1)
         ON CONFLICT(network_hash, day) DO UPDATE
         SET count = count + 1
         WHERE count < ?
         RETURNING count`,
      )
      .bind(networkHash, day, limit)
      .first<{ count: number }>();
    return row?.count ?? null;
  }
}

export class MemoryUsageStore implements UsageStore {
  private readonly sessions = new Map<string, { count: number; networkHash: string }>();
  private readonly networks = new Map<string, number>();

  async chargeSession(
    sessionId: string,
    day: string,
    networkHash: string,
    limit: number,
  ): Promise<number | null> {
    const key = `${sessionId}:${day}`;
    const current = this.sessions.get(key)?.count ?? 0;
    if (current >= limit) return null;
    const count = current + 1;
    this.sessions.set(key, { count, networkHash });
    return count;
  }

  async chargeNetwork(networkHash: string, day: string, limit: number): Promise<number | null> {
    const key = `${networkHash}:${day}`;
    const current = this.networks.get(key) ?? 0;
    if (current >= limit) return null;
    const count = current + 1;
    this.networks.set(key, count);
    return count;
  }

  inspect(): unknown {
    return { sessions: [...this.sessions.entries()], networks: [...this.networks.entries()] };
  }
}
