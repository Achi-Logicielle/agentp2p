import fs from 'fs';
import selfsigned from 'selfsigned';

const attrs = [{ name: 'commonName', value: 'localhost' }];
const pems = selfsigned.generate(attrs, { days: 365 });

fs.mkdirSync('./cert', { recursive: true });
fs.writeFileSync('./cert/cert.pem', pems.cert);
fs.writeFileSync('./cert/key.pem', pems.private);

console.log("✔ Certificats TLS auto-signés générés dans /cert !");
