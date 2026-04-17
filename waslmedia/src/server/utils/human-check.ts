import { decryptSecret, encryptSecret } from '@/server/utils/secret-box';

const HUMAN_CHECK_TTL_MS = 1000 * 60 * 10;
const HUMAN_CHECK_LENGTH = 5;

function randomDigits(length: number) {
  let value = '';
  for (let index = 0; index < length; index += 1) {
    value += Math.floor(Math.random() * 10).toString();
  }
  return value;
}

function normalizeAnswer(value: string | null | undefined) {
  return (value || '').replace(/\s+/g, '').trim();
}

export function createHumanCheckChallenge(action: string) {
  const answer = randomDigits(HUMAN_CHECK_LENGTH);
  const expiresAt = Date.now() + HUMAN_CHECK_TTL_MS;
  const token = encryptSecret(
    JSON.stringify({
      action,
      answer,
      expiresAt,
    }),
  );

  return {
    prompt: `Type ${answer} to continue`,
    token,
    expiresAt,
  };
}

export function verifyHumanCheckChallenge(input: {
  action: string;
  token: string | null | undefined;
  answer: string | null | undefined;
}) {
  const token = input.token?.trim();
  const answer = normalizeAnswer(input.answer);

  if (!token || !answer) {
    return {
      enabled: true,
      success: false,
      error: 'VERIFICATION_REQUIRED',
    };
  }

  try {
    const payload = JSON.parse(decryptSecret(token)) as {
      action?: string;
      answer?: string;
      expiresAt?: number;
    };

    if (
      payload.action !== input.action ||
      !payload.answer ||
      typeof payload.expiresAt !== 'number' ||
      payload.expiresAt < Date.now()
    ) {
      return {
        enabled: true,
        success: false,
        error: 'VERIFICATION_EXPIRED',
      };
    }

    if (normalizeAnswer(payload.answer) !== answer) {
      return {
        enabled: true,
        success: false,
        error: 'VERIFICATION_INCORRECT',
      };
    }

    return {
      enabled: true,
      success: true,
    };
  } catch {
    return {
      enabled: true,
      success: false,
      error: 'VERIFICATION_FAILED',
    };
  }
}
