import { isIP } from 'node:net';

const DEV_MEDIA_SECRET = 'waslmedia-dev-media-secret';
const DEV_SECRET_BOX_SEED = 'waslmedia-dev-secret-box';
const DEV_REDIS_URL = 'redis://127.0.0.1:6379';

function normalizeEnvValue(value: string | undefined | null) {
  const normalized = value?.trim();
  return normalized ? normalized : '';
}

export type AppEnvironmentMode = 'development' | 'staging' | 'production';

export function getAppEnvironmentMode(): AppEnvironmentMode {
  if (process.env.NODE_ENV === 'production') {
    return 'production';
  }

  const explicit = normalizeEnvValue(process.env.APP_ENV_MODE).toLowerCase();

  if (explicit === 'development' || explicit === 'staging' || explicit === 'production') {
    return explicit;
  }

  return 'development';
}

export function isProductionRuntime() {
  return getAppEnvironmentMode() === 'production';
}

export function isInternalToolsEnabled() {
  return getAppEnvironmentMode() === 'development';
}

function getRequiredEnv(name: string) {
  const value = normalizeEnvValue(process.env[name]);
  if (value) {
    return value;
  }

  throw new Error(`MISSING_RUNTIME_CONFIG:${name}`);
}

export function getMediaTokenSecret() {
  const explicit = normalizeEnvValue(process.env.MEDIA_TOKEN_SECRET);
  if (explicit) {
    return explicit;
  }

  const authSecret = normalizeEnvValue(process.env.AUTH_SECRET);
  if (authSecret) {
    return authSecret;
  }

  if (!isProductionRuntime()) {
    return DEV_MEDIA_SECRET;
  }

  throw new Error('MISSING_RUNTIME_CONFIG:MEDIA_TOKEN_SECRET');
}

export function getSecretBoxSeed() {
  const authSecret = normalizeEnvValue(process.env.AUTH_SECRET);
  if (authSecret) {
    return authSecret;
  }

  const mediaSecret = normalizeEnvValue(process.env.MEDIA_TOKEN_SECRET);
  if (mediaSecret) {
    return mediaSecret;
  }

  if (!isProductionRuntime()) {
    return DEV_SECRET_BOX_SEED;
  }

  throw new Error('MISSING_RUNTIME_CONFIG:AUTH_SECRET');
}

export function getStorageRuntimeConfig() {
  const endpoint =
    normalizeEnvValue(process.env.STORAGE_ENDPOINT) ||
    (!isProductionRuntime() ? 'http://localhost:9000' : '');
  const publicEndpoint =
    normalizeEnvValue(process.env.STORAGE_PUBLIC_URL) ||
    endpoint;
  const accessKeyId =
    normalizeEnvValue(process.env.MINIO_ROOT_USER) ||
    (!isProductionRuntime() ? 'minioadmin' : '');
  const secretAccessKey =
    normalizeEnvValue(process.env.MINIO_ROOT_PASSWORD) ||
    (!isProductionRuntime() ? 'minioadmin123' : '');

  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error('MISSING_RUNTIME_CONFIG:STORAGE');
  }

  return {
    endpoint,
    publicEndpoint,
    accessKeyId,
    secretAccessKey,
  };
}

export function getRedisUrl() {
  const redisUrl = normalizeEnvValue(process.env.REDIS_URL) || (!isProductionRuntime() ? DEV_REDIS_URL : '');
  if (!redisUrl) {
    throw new Error('MISSING_RUNTIME_CONFIG:REDIS_URL');
  }

  return redisUrl;
}

export function getAppBaseUrl() {
  const explicit =
    normalizeEnvValue(process.env.APP_BASE_URL) ||
    normalizeEnvValue(process.env.NEXT_PUBLIC_APP_BASE_URL) ||
    (!isProductionRuntime() ? 'http://localhost:9002' : '');

  if (!explicit) {
    throw new Error('MISSING_RUNTIME_CONFIG:APP_BASE_URL');
  }

  try {
    return new URL(explicit).toString().replace(/\/+$/, '');
  } catch {
    throw new Error('INVALID_RUNTIME_CONFIG:APP_BASE_URL');
  }
}

export function getInternalAdminBootstrapConfig() {
  const email =
    normalizeEnvValue(process.env.INTERNAL_ADMIN_BOOTSTRAP_EMAIL) ||
    normalizeEnvValue(process.env.API_DOCS_ADMIN_EMAIL) ||
    (!isProductionRuntime() ? 'admin@waslmedia.local' : '');
  const password =
    normalizeEnvValue(process.env.INTERNAL_ADMIN_BOOTSTRAP_PASSWORD) ||
    normalizeEnvValue(process.env.API_DOCS_ADMIN_PASSWORD) ||
    (!isProductionRuntime() ? 'admin-docs' : '');
  const name = normalizeEnvValue(process.env.INTERNAL_ADMIN_BOOTSTRAP_NAME) || 'Waslmedia Bootstrap Admin';

  if (!email || !password) {
    if (!isProductionRuntime()) {
      return {
        email,
        password,
        name,
        configured: Boolean(email && password),
      };
    }

    throw new Error('MISSING_RUNTIME_CONFIG:INTERNAL_ADMIN_BOOTSTRAP');
  }

  return {
    email,
    password,
    name,
    configured: true,
  };
}

export function getRazorpayRuntimeConfig() {
  const keyId = normalizeEnvValue(process.env.RAZORPAY_KEY_ID);
  const keySecret = normalizeEnvValue(process.env.RAZORPAY_KEY_SECRET);
  const webhookSecret = normalizeEnvValue(process.env.RAZORPAY_WEBHOOK_SECRET);
  const webhookUrl = normalizeEnvValue(process.env.RAZORPAY_WEBHOOK_URL) || `${getAppBaseUrl()}/api/payments/razorpay/webhook`;

  if (!keyId || !keySecret || !webhookSecret) {
    if (!isProductionRuntime()) {
      return {
        keyId,
        keySecret,
        webhookSecret,
        webhookUrl,
        configured: Boolean(keyId && keySecret && webhookSecret),
      };
    }

    throw new Error('MISSING_RUNTIME_CONFIG:RAZORPAY');
  }

  return {
    keyId,
    keySecret,
    webhookSecret,
    webhookUrl,
    configured: true,
  };
}

export function getAdsRuntimeConfig() {
  const parseIntWithFallback = (value: string | undefined, fallback: number) => {
    const parsed = Number.parseInt(normalizeEnvValue(value), 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  };

  const parseFloatWithFallback = (value: string | undefined, fallback: number) => {
    const parsed = Number.parseFloat(normalizeEnvValue(value));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  };

  return {
    currency: normalizeEnvValue(process.env.ADS_CURRENCY) || 'INR',
    gstPercent: parseFloatWithFallback(process.env.ADS_GST_PERCENT, 18),
    oneCampaignLimit: parseIntWithFallback(process.env.ADS_ONE_CAMPAIGN_LIMIT, 1),
    reviewRequired: normalizeEnvValue(process.env.ADS_REVIEW_REQUIRED).toLowerCase() !== 'false',
    homeInsertInterval: parseIntWithFallback(process.env.ADS_HOME_INSERT_INTERVAL, 12),
    searchInsertInterval: parseIntWithFallback(process.env.ADS_SEARCH_INSERT_INTERVAL, 12),
    impressionMinVisibleMs: parseIntWithFallback(process.env.ADS_IMPRESSION_MIN_VISIBLE_MS, 1200),
    impressionMinVisibleRatio: parseFloatWithFallback(process.env.ADS_IMPRESSION_MIN_VISIBLE_RATIO, 0.6),
    allowedPlacements: (normalizeEnvValue(process.env.ADS_ALLOWED_PLACEMENTS) || 'home,search')
      .split(',')
      .map((value) => value.trim())
      .filter((value): value is 'home' | 'search' => value === 'home' || value === 'search'),
  };
}

export function getSmtpRuntimeConfig() {
  const enabled = normalizeEnvValue(process.env.SMTP_ENABLED).toLowerCase() === 'true';
  const host = normalizeEnvValue(process.env.SMTP_HOST);
  const port = Number.parseInt(normalizeEnvValue(process.env.SMTP_PORT), 10) || 587;
  const secure = normalizeEnvValue(process.env.SMTP_SECURE).toLowerCase() === 'true';
  const user = normalizeEnvValue(process.env.SMTP_USER);
  const password = normalizeEnvValue(process.env.SMTP_PASSWORD);
  const fromEmail = normalizeEnvValue(process.env.SMTP_FROM_EMAIL);
  const fromName = normalizeEnvValue(process.env.SMTP_FROM_NAME) || 'Waslmedia';
  const replyTo = normalizeEnvValue(process.env.SMTP_REPLY_TO) || null;
  const configured = Boolean(host && port && user && password && fromEmail);

  if (enabled && !configured && isProductionRuntime()) {
    throw new Error('MISSING_RUNTIME_CONFIG:SMTP');
  }

  return {
    enabled,
    configured,
    host,
    port,
    secure,
    user,
    password,
    fromEmail,
    fromName,
    replyTo,
  };
}

export function assertRuntimeConfiguration() {
  if (!isProductionRuntime()) {
    return;
  }

  getRequiredEnv('AUTH_SECRET');
  getRequiredEnv('MEDIA_TOKEN_SECRET');
  getRequiredEnv('DB_HOST');
  getRequiredEnv('DB_USER');
  getRequiredEnv('DB_PASSWORD');
  getRequiredEnv('DB_NAME');
  getStorageRuntimeConfig();
  getRedisUrl();
  getAppBaseUrl();
  getRazorpayRuntimeConfig();
  getAdsRuntimeConfig();
  getSmtpRuntimeConfig();
}

function isPrivateHostname(hostname: string) {
  const normalized = hostname.toLowerCase();
  if (
    normalized === 'localhost' ||
    normalized === '127.0.0.1' ||
    normalized === '::1' ||
    normalized.endsWith('.localhost') ||
    normalized === 'host.docker.internal'
  ) {
    return true;
  }

  const ipVersion = isIP(normalized);
  if (!ipVersion) {
    return false;
  }

  if (ipVersion === 6) {
    return normalized.startsWith('fc') || normalized.startsWith('fd') || normalized.startsWith('fe80');
  }

  const [first, second] = normalized.split('.').map((part) => Number(part));
  return (
    first === 10 ||
    first === 127 ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    (first === 169 && second === 254)
  );
}

export function validateTrustedAiBaseUrl(baseUrl: string) {
  let parsed: URL;
  try {
    parsed = new URL(baseUrl);
  } catch {
    throw new Error('INVALID_AI_BASE_URL');
  }

  if (!/^https?:$/.test(parsed.protocol)) {
    throw new Error('INVALID_AI_BASE_URL');
  }

  if (isProductionRuntime() && parsed.protocol !== 'https:') {
    throw new Error('INVALID_AI_BASE_URL');
  }

  if (parsed.username || parsed.password) {
    throw new Error('INVALID_AI_BASE_URL');
  }

  if (isPrivateHostname(parsed.hostname)) {
    throw new Error('INVALID_AI_BASE_URL');
  }

  const allowlist = normalizeEnvValue(process.env.ALLOWED_AI_BASE_URL_HOSTS)
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  if (allowlist.length > 0) {
    const hostname = parsed.hostname.toLowerCase();
    const isAllowed = allowlist.some(
      (allowed) => hostname === allowed || hostname.endsWith(`.${allowed}`)
    );

    if (!isAllowed) {
      throw new Error('INVALID_AI_BASE_URL');
    }
  }

  parsed.hash = '';
  return parsed.toString().replace(/\/+$/, '');
}
