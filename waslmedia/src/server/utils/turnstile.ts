import { getTurnstileClientConfig, getTurnstileSecretKey, getTurnstileSiteKey } from '@/lib/turnstile/config';

export { getTurnstileClientConfig };

export async function verifyTurnstileToken(input: {
  token: string | null | undefined;
  remoteIp?: string | null;
  action?: string;
  expectedHostname?: string | null;
}) {
  const siteKey = getTurnstileSiteKey();
  const secretKey = getTurnstileSecretKey();
  const enabled = Boolean(siteKey && secretKey);

  if (!enabled) {
    return {
      enabled: false,
      success: true,
    };
  }

  if (!input.token) {
    return {
      enabled: true,
      success: false,
      error: 'TURNSTILE_REQUIRED',
    };
  }

  const formData = new FormData();
  formData.set('secret', secretKey);
  formData.set('response', input.token);
  if (input.remoteIp) {
    formData.set('remoteip', input.remoteIp);
  }

  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: formData,
  });

  const payload = (await response.json().catch(() => null)) as
    | {
        success?: boolean;
        hostname?: string;
        action?: string;
        ['error-codes']?: string[];
      }
    | null;

  if (!response.ok || !payload?.success) {
    return {
      enabled: true,
      success: false,
      error: payload?.['error-codes']?.[0] || 'TURNSTILE_FAILED',
    };
  }

  if (input.action && payload.action && payload.action !== input.action) {
    return {
      enabled: true,
      success: false,
      error: 'TURNSTILE_ACTION_MISMATCH',
    };
  }

  if (input.expectedHostname && payload.hostname && payload.hostname !== input.expectedHostname) {
    return {
      enabled: true,
      success: false,
      error: 'TURNSTILE_HOSTNAME_MISMATCH',
    };
  }

  return {
    enabled: true,
    success: true,
  };
}

export function getRequestIpAddress(request: Request) {
  const forwarded = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || '';
  if (!forwarded) {
    return null;
  }

  return forwarded.split(',')[0]?.trim() || null;
}
