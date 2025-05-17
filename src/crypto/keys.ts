import { ec as EC } from 'elliptic';
import fs from 'fs';
import path from 'path';

const ec = new EC('secp256k1');
const privateKeyPath = path.join(__dirname, '../../../cert/private.pem');
const publicKeyPath = path.join(__dirname, '../../../cert/public.pem');

export function generateKeys() {
  const key = ec.genKeyPair();
  fs.mkdirSync(path.dirname(privateKeyPath), { recursive: true });

  fs.writeFileSync(privateKeyPath, key.getPrivate('hex'));
  fs.writeFileSync(publicKeyPath, key.getPublic('hex'));
  console.log('✅ Clés générées.');
}

export function loadPrivateKey() {
  const privateHex = fs.readFileSync(privateKeyPath, 'utf8');
  return ec.keyFromPrivate(privateHex, 'hex');
}

export function loadPublicKey() {
  const publicHex = fs.readFileSync(publicKeyPath, 'utf8');
  return ec.keyFromPublic(publicHex, 'hex');
}
