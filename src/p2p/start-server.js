const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const os = require("os");

// Récupérer l'adresse IP du serveur
function getServerIP() {
  const interfaces = os.networkInterfaces();
  let serverIP = "localhost";

  // Chercher une adresse IPv4 non-interne
  Object.keys(interfaces).forEach((ifname) => {
    interfaces[ifname].forEach((iface) => {
      if ("IPv4" === iface.family && !iface.internal) {
        serverIP = iface.address;
      }
    });
  });

  return serverIP;
}

const SERVER_IP = process.env.SERVER_IP || getServerIP();
const SERVER_PORT = process.env.P2P_PORT || "8443";

// Vérifier si les certificats existent
const certPath = path.join(__dirname, "../cert/cert.pem");
const keyPath = path.join(__dirname, "../cert/key.pem");

if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
  console.log("⚠️ Certificats manquants, génération en cours...");

  // Générer les certificats
  const generateCerts = spawn(
    "node",
    [path.join(__dirname, "generate-certificates.js"), SERVER_IP],
    { stdio: "inherit" }
  );

  generateCerts.on("close", (code) => {
    if (code !== 0) {
      console.error("❌ Échec de la génération des certificats");
      process.exit(1);
    }

    // Démarrer le serveur après la génération des certificats
    startServer();
  });
} else {
  // Les certificats existent déjà, démarrer le serveur
  startServer();
}

function startServer() {
  console.log(`🌐 Démarrage du serveur P2P sur ${SERVER_IP}:${SERVER_PORT}...`);

  const serverProcess = spawn(
    "node",
    [
      require.resolve("ts-node/register"),
      "C:\\Users\\nesri\\agent P2P\\src\\p2p\\server.ts", // Removed the duplicate "src"
    ],
    {
      stdio: "inherit",
      env: {
        ...process.env,
        P2P_PORT: SERVER_PORT,
        SERVER_IP: SERVER_IP,
      },
    }
  );

  serverProcess.on("close", (code) => {
    console.log(`🛑 Serveur P2P arrêté avec code ${code}`);
  });

  // Afficher les informations pour la connexion des clients
  console.log("\n📋 INFORMATIONS DE CONNEXION CLIENT:");
  console.log(`Pour connecter un client à ce serveur, utilisez:`);
  console.log(
    `npm run start-client -- --server=wss://${SERVER_IP}:${SERVER_PORT}`
  );
  console.log(
    '\n⚠️ NOTE: Si vous utilisez des machines différentes, copiez les certificats du dossier "cert" sur la machine cliente\n'
  );
}
