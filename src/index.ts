// src/index.ts
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { EnergyMessagingService } from './p2p/EnergyMessagingService';

// Charger les variables d'environnement
dotenv.config();

// Configuration
const MICROGRID_ID = process.env.MICROGRID_ID || 'microgrid-1';
const P2P_SERVER = process.env.P2P_SERVER || 'wss://localhost:8443';
const P2P_MODE = process.env.P2P_MODE || 'client'; 
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://llaouinine:V6Yh16p6kAN4n7eR@cluster0.4htxlff.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const STATE_SHARING_INTERVAL = parseInt(process.env.STATE_SHARING_INTERVAL || '60000');

async function startApplication() {
  try {
   
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB connecté');

    // Démarrer le serveur P2P si nécessaire
    if (P2P_MODE === 'server' || P2P_MODE === 'both') {
      await import('./p2p/server');
      console.log('reseau P2P démarré');
    }

    
    if (P2P_MODE === 'client' || P2P_MODE === 'both') {
  
      if (P2P_MODE === 'both') {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
     
      const messagingService = new EnergyMessagingService(MICROGRID_ID, P2P_SERVER);
      
      // Se connecter au réseau P2P
      await messagingService.connect();
      
      messagingService.startPeriodicStateSharing(STATE_SHARING_INTERVAL);
      
      console.log(`microgrid P2P démarré pour ${MICROGRID_ID}`);
      
      // Gérer la fermeture propre
      setupGracefulShutdown(messagingService);
    }
  } catch (error) {
    console.error('Erreur de démarrage de l\'application:', error);
    process.exit(1);
  }
}


function setupGracefulShutdown(messagingService: EnergyMessagingService) {
  const shutdown = () => {
    console.log('Arrêt de l\'application...');
    messagingService.disconnect();
    mongoose.disconnect()
      .then(() => console.log('MongoDB déconnecté'))
      .catch(err => console.error('Erreur déconnexion MongoDB:', err))
      .finally(() => process.exit(0));
  };

  // Intercepter les signaux d'arrêt
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

// Démarrer l'application
startApplication();