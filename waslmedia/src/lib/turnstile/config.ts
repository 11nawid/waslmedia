const TURNSTILE_TEST_SITE_KEY = '1x00000000000000000000AA';
const TURNSTILE_TEST_SECRET_KEY = '1x0000000000000000000000000000000AA';

function normalizeEnvValue(value: string | undefined | null) {
  const normalized = value?.trim();
  return normalized ? normalized : '';
}

export function getTurnstileSiteKey() {
  if (process.env.NODE_ENV !== 'production') {
    return TURNSTILE_TEST_SITE_KEY;
  }

  return normalizeEnvValue(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
}

export function getTurnstileSecretKey() {
  if (process.env.NODE_ENV !== 'production') {
    return TURNSTILE_TEST_SECRET_KEY;
  }

  return normalizeEnvValue(process.env.TURNSTILE_SECRET_KEY);
}

export function getTurnstileClientConfig() {
  const siteKey = getTurnstileSiteKey();

  return {
    enabled: Boolean(siteKey),
    siteKey,
  };
}
