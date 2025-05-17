// scripts/generate-certificates.js
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Chemin pour les certificats
const certDir = path.resolve(__dirname, '../cert');
const certFile = path.join(certDir, 'cert.pem');
const keyFile = path.join(certDir, 'key.pem');

// Créer le répertoire des certificats s'il n'existe pas
if (!fs.existsSync(certDir)) {
  console.log('📁 Création du répertoire des certificats...');
  fs.mkdirSync(certDir, { recursive: true });
}

// Générer un certificat auto-signé avec OpenSSL
console.log('🔑 Génération du certificat auto-signé...');

// Utiliser l'adresse IP du serveur ou un nom de domaine si disponible
const serverIP = process.argv[2] || 'localhost';
console.log(`🌐 Création du certificat pour: ${serverIP}`);

const opensslCommand = `openssl req -x509 -newkey rsa:4096 -keyout ${keyFile} -out ${certFile} -days 365 -nodes -subj "/CN=${serverIP}"`;

exec(opensslCommand, (error: any, stdout: any, stderr: any) => {
  if (error) {
    console.error('❌ Erreur lors de la génération du certificat:', error);
    console.error('💡 Assurez-vous qu\'OpenSSL est installé sur votre système');
    process.exit(1);
  }
  
  console.log('✅ Certificats générés avec succès!');
  console.log(`📜 Certificat: ${certFile}`);
  console.log(`🔑 Clé privée: ${keyFile}`);
  
  console.log('\n🚀 INSTRUCTIONS:');
  console.log('1. Assurez-vous que ces certificats sont présents sur le serveur ET sur le client');
  console.log('2. Démarrez le serveur avec: npm run start-server');
  console.log(`3. Démarrez le client avec: npm run start-client -- --server=${serverIP}`);
});