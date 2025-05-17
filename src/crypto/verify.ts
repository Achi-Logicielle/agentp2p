import { loadPublicKey } from './keys';

export function verifyMessage(message: object, signatureHex: string): boolean {
  const key = loadPublicKey();
  const hash = JSON.stringify(message);
  return key.verify(hash, signatureHex);
}
