// src/p2p/client.ts
import { EnergyMessagingService } from './EnergyMessagingService';

// Configuration du client microgrid
const MICROGRID_ID = process.env.MICROGRID_ID || 'microgrid-1';
const P2P_SERVER = process.env.P2P_SERVER || 'wss://localhost:8443';

// Intervalle pour le partage d'état (en ms)
const STATE_SHARING_INTERVAL = 60000; // 1 minute

async function main() {
  try {
    console.log(`🔌 Initialisation du client P2P pour ${MICROGRID_ID}...`);
    
    // Créer le service de messagerie
    const messagingService = new EnergyMessagingService(MICROGRID_ID, P2P_SERVER);
    
    // Se connecter au réseau P2P
    await messagingService.connect();
    
    // Démarrer le partage périodique d'état
    messagingService.startPeriodicStateSharing(STATE_SHARING_INTERVAL);
    
    // Simuler quelques propositions d'échange basées sur l'état du système
    simulateExchangeProposals(messagingService);
    
    // Gérer la fermeture propre de l'application
    setupGracefulShutdown(messagingService);
    
  } catch (error) {
    console.error('❌ Erreur d\'initialisation du client P2P:', error);
    process.exit(1);
  }
}

/**
 * Simule l'émission périodique de propositions d'échange
 * Dans un système réel, cela serait déclenché par l'algorithme de gestion d'énergie
 */
function simulateExchangeProposals(messagingService: EnergyMessagingService) {
  // Simuler une proposition d'échange toutes les 2-5 minutes
  setInterval(() => {
    // Générer aléatoirement un surplus ou un besoin d'énergie
    const energyBalance = (Math.random() * 20 - 10).toFixed(2);
    const energyAmount = parseFloat(energyBalance);
    
    // Deadline aléatoire entre 15 et 60 minutes
    const deadlineMinutes = Math.floor(Math.random() * 46) + 15;
    
    console.log(`🔄 Simulation: ${energyAmount > 0 ? 'Surplus' : 'Besoin'} d'énergie détecté: ${Math.abs(energyAmount)} kWh`);
    
    // Proposer un échange uniquement si la quantité est significative
    if (Math.abs(energyAmount) > 2) {
      messagingService.proposeEnergyExchange(energyAmount, deadlineMinutes);
    }
  }, Math.floor(Math.random() * 180000) + 120000); // Entre 2 et 5 minutes
}

/**
 * Configure la fermeture propre de l'application
 */
function setupGracefulShutdown(messagingService: EnergyMessagingService) {
  const shutdown = () => {
    console.log('🛑 Arrêt du client P2P...');
    messagingService.disconnect();
    process.exit(0);
  };

  // Intercepter les signaux d'arrêt
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

// Démarrer le client
main();