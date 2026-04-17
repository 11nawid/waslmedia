const VERIFICATION_ERRORS = new Set([
  'VERIFICATION_REQUIRED',
  'VERIFICATION_EXPIRED',
  'VERIFICATION_INCORRECT',
  'VERIFICATION_FAILED',
  'TURNSTILE_REQUIRED',
]);

export function isVerificationError(message: string | null | undefined) {
  if (!message) {
    return false;
  }

  return VERIFICATION_ERRORS.has(message) || message.startsWith('TURNSTILE_');
}
