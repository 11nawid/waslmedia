import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { getSecretBoxSeed } from '@/server/utils/runtime-config';

const SECRET_ALGORITHM = 'aes-256-gcm';

function buildKey() {
  return createHash('sha256').update(getSecretBoxSeed()).digest();
}

export function encryptSecret(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv(SECRET_ALGORITHM, buildKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64url')}.${tag.toString('base64url')}.${encrypted.toString('base64url')}`;
}

export function decryptSecret(payload: string) {
  const [ivEncoded, tagEncoded, encryptedEncoded] = payload.split('.');
  if (!ivEncoded || !tagEncoded || !encryptedEncoded) {
    throw new Error('INVALID_SECRET_PAYLOAD');
  }

  const decipher = createDecipheriv(
    SECRET_ALGORITHM,
    buildKey(),
    Buffer.from(ivEncoded, 'base64url')
  );
  decipher.setAuthTag(Buffer.from(tagEncoded, 'base64url'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedEncoded, 'base64url')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}
