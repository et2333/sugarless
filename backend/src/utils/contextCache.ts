/**
 * 用户上下文短期缓存，减少重复 DB 查询
 */
export interface CachedUserContext {
  userId: string;
  userProfile?: unknown;
  recentGlucose?: unknown[];
  medications?: unknown[];
}

const TTL_MS = parseInt(process.env.CONTEXT_CACHE_TTL_MS || '30000', 10);

interface CacheEntry {
  context: CachedUserContext;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

export function getCachedContext(userId: string): CachedUserContext | null {
  const entry = cache.get(userId);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(userId);
    return null;
  }
  return entry.context;
}

export function setCachedContext(userId: string, context: CachedUserContext): void {
  cache.set(userId, { context, expiresAt: Date.now() + TTL_MS });
}

export function invalidateContextCache(userId?: string): void {
  if (userId) {
    cache.delete(userId);
  } else {
    cache.clear();
  }
}
