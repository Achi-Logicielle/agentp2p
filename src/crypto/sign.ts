import { loadPrivateKey } from './keys';

export function signMessage(message: object): string {
  const key = loadPrivateKey();
  const hash = JSON.stringify(message);
  const signature = key.sign(hash);
  return signature.toDER('hex');
}
