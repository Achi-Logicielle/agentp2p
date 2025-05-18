// src/p2p/client.ts
import { EnergyMessagingService } from './EnergyMessagingService';

const MICROGRID_ID = process.env.MICROGRID_ID || 'microgrid-1';
const P2P_SERVER = process.env.P2P_SERVER || 'wss://localhost:8443';


const STATE_SHARING_INTERVAL = 120000; 

async function main() {
  try {
    console.log(`Initialisation du client P2P pour ${MICROGRID_ID}`);
    const messagingService = new EnergyMessagingService(MICROGRID_ID, P2P_SERVER);
    await messagingService.connect();
    messagingService.startPeriodicStateSharing(STATE_SHARING_INTERVAL);
    simulateExchangeProposals(messagingService);
    setupGracefulShutdown(messagingService);
    
  } catch (error) {
    console.error('Erreur d\'initialisation du client P2P:', error);
    process.exit(1);
  }
}

function simulateExchangeProposals(messagingService: EnergyMessagingService) {
  setInterval(() => {
    const energyBalance = (Math.random() * 20 - 10).toFixed(2);
    const energyAmount = parseFloat(energyBalance);
    const deadlineMinutes = Math.floor(Math.random() * 46) + 15;
    
    console.log(`Simulation: ${energyAmount > 0 ? 'Surplus' : 'Besoin'} d'énergie détecté: ${Math.abs(energyAmount)} kWh`);
    if (Math.abs(energyAmount) > 2) {
      messagingService.proposeEnergyExchange(energyAmount, deadlineMinutes);
    }
  }, Math.floor(Math.random() * 180000) + 120000); 
}


function setupGracefulShutdown(messagingService: EnergyMessagingService) {
  const shutdown = () => {
    console.log('Arrêt du P2P...');
    messagingService.disconnect();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}


main();