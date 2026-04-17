const store = new Map<string, { count: number; resetAt: number }>();

function getClientIp(request: Request) {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || 'unknown';
  }

  return request.headers.get('x-real-ip') || 'unknown';
}

export function enforceRateLimit(request: Request, key: string, limit: number, windowMs: number) {
  const scope = `${key}:${getClientIp(request)}`;
  const now = Date.now();
  const current = store.get(scope);

  if (!current || current.resetAt <= now) {
    store.set(scope, { count: 1, resetAt: now + windowMs });
    return { limited: false, retryAfterSeconds: 0 };
  }

  if (current.count >= limit) {
    return {
      limited: true,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }

  current.count += 1;
  store.set(scope, current);
  return { limited: false, retryAfterSeconds: 0 };
}
