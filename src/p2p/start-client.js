// scripts/start-client.js
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Parser les arguments de ligne de commande
function parseArgs() {
  const args = {};
  
  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    
    if (arg.startsWith('--')) {
      const [key, value] = arg.substring(2).split('=');
      args[key] = value || true;
    }
  }
  
  return args;
}

const args = parseArgs();
const MICROGRID_ID = args.id || process.env.MICROGRID_ID || `microgrid-${Math.floor(Math.random() * 1000)}`;

// Déterminer l'URL du serveur
let SERVER_URL = 'wss://localhost:8443';

if (args.server) {
  // Si l'URL est fournie directement
  SERVER_URL = args.server.startsWith('ws') ? args.server : `wss://${args.server}`;
} else if (process.env.SERVER_IP) {
  // Si l'adresse IP du serveur est fournie via une variable d'environnement
  const serverIP = process.env.SERVER_IP;
  const serverPort = process.env.P2P_PORT || '8443';
  SERVER_URL = `wss://${serverIP}:${serverPort}`;
}

// Vérifier si les certificats existent
const certPath = path.join(__dirname, '../cert/cert.pem');

if (!fs.existsSync(certPath)) {
  console.warn('⚠️ Certificat non trouvé:', certPath);
  console.warn('La connexion au serveur pourrait échouer sans certificat valide.');
  console.warn('Générez des certificats sur le serveur et copiez-les dans le dossier "cert" du client.');
}

console.log(`🌐 Démarrage du client P2P ${MICROGRID_ID} pour le serveur ${SERVER_URL}...`);

// Démarrer le client
const clientProcess = spawn('node', [
  require.resolve('ts-node/register'),
  path.resolve(__dirname, '../src/index.ts')
], {
  stdio: 'inherit',
  env: {
    ...process.env,
    MICROGRID_ID: MICROGRID_ID,
    P2P_SERVER: SERVER_URL
  }
});

clientProcess.on('close', (code) => {
  console.log(`🛑 Client P2P arrêté avec code ${code}`);
});