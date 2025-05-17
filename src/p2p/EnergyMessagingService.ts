// src/p2p/EnergyMessagingService.ts
import WebSocket from 'ws';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Types de messages pour le protocole P2P
export interface EnergyStateMessage {
  type: 'energy_state';
  sender: string;
  timestamp: string;
  state_of_charge: number;  // Pourcentage 0-100
  forecast_production: string; // kWh
  forecast_consumption: string; // kWh
}

export interface EnergyExchangeProposal {
  type: 'energy_exchange';
  sender: string;
  timestamp: string;
  session_id: string;
  energy_amount: number; // Positif = offre, négatif = demande
  deadline: string; // ISO date string
}

export type P2PMessage = EnergyStateMessage | EnergyExchangeProposal;

export class EnergyMessagingService {
  private ws: WebSocket | null = null;
  private microgridId: string;
  private serverUrl: string;
  private stateInterval: NodeJS.Timeout | null = null;
  
  constructor(microgridId: string, serverUrl: string = 'wss://localhost:8443') {
    this.microgridId = microgridId;
    this.serverUrl = serverUrl;
  }

  /**
   * Se connecte au réseau P2P
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.serverUrl, {
          cert: fs.readFileSync(path.join(__dirname, '../../cert/cert.pem')),
          rejectUnauthorized: false // Pour autoriser auto-signé en dev
        });

        this.ws.on('open', () => {
          console.log(`🚀 Microgrid ${this.microgridId} connecté au réseau P2P`);
          this.setupListeners();
          resolve();
        });

        this.ws.on('error', (err) => {
          console.error('❌ Erreur WebSocket:', err);
          reject(err);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Configure les écouteurs d'événements WebSocket
   */
  private setupListeners(): void {
    if (!this.ws) return;

    this.ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString()) as P2PMessage;
        console.log(`📥 Message reçu de type ${message.type}:`, message);
        
        // Ici vous pouvez ajouter une logique de traitement spécifique
        // selon le type de message reçu
        if (message.type === 'energy_exchange') {
          this.handleExchangeProposal(message);
        }
      } catch (error) {
        console.error('❌ Erreur de traitement du message:', error);
      }
    });

    this.ws.on('close', () => {
      console.log(`❌ Microgrid ${this.microgridId} déconnecté du réseau P2P`);
      this.stopPeriodicStateSharing();
    });
  }

  /**
   * Démarre le partage périodique de l'état énergétique
   * @param intervalMs Intervalle en millisecondes
   */
  startPeriodicStateSharing(intervalMs: number = 60000): void {
    // Arrêter tout intervalle existant
    this.stopPeriodicStateSharing();
    
    // Publier immédiatement le premier état
    this.publishEnergyState();
    
    // Configurer l'intervalle pour les publications suivantes
    this.stateInterval = setInterval(() => {
      this.publishEnergyState();
    }, intervalMs);
  }

  /**
   * Arrête le partage périodique de l'état énergétique
   */
  stopPeriodicStateSharing(): void {
    if (this.stateInterval) {
      clearInterval(this.stateInterval);
      this.stateInterval = null;
    }
  }

  /**
   * Publie l'état énergétique actuel du microgrid
   * Dans un cas réel, ces valeurs proviendraient de capteurs/système
   */
  publishEnergyState(): void {
    if (!this.ws) {
      console.error("❌ Pas de connexion WebSocket active");
      return;
    }

    // Ces valeurs seraient obtenues depuis votre système de gestion d'énergie
    const stateMessage: EnergyStateMessage = {
      type: 'energy_state',
      sender: this.microgridId,
      timestamp: new Date().toISOString(),
      state_of_charge: Math.floor(Math.random() * 101),  // Simulation
      forecast_production: (Math.random() * 20).toFixed(2), // Simulation
      forecast_consumption: (Math.random() * 20).toFixed(2), // Simulation
    };

    this.sendMessage(stateMessage);
  }

  /**
   * Envoie une proposition d'échange d'énergie
   * @param energyAmount Quantité d'énergie (+ pour offre, - pour demande)
   * @param deadlineMinutes Délai en minutes pour l'échange
   */
  proposeEnergyExchange(energyAmount: number, deadlineMinutes: number = 30): void {
    if (!this.ws) {
      console.error("❌ Pas de connexion WebSocket active");
      return;
    }

    const deadline = new Date();
    deadline.setMinutes(deadline.getMinutes() + deadlineMinutes);

    const proposal: EnergyExchangeProposal = {
      type: 'energy_exchange',
      sender: this.microgridId,
      timestamp: new Date().toISOString(),
      session_id: this.generateSessionId(),
      energy_amount: energyAmount,
      deadline: deadline.toISOString(),
    };

    this.sendMessage(proposal);
  }

  /**
   * Traite une proposition d'échange reçue
   * @param proposal La proposition reçue
   */
  private handleExchangeProposal(proposal: EnergyExchangeProposal): void {
    // Logique de décision pour accepter/refuser une proposition
    // Ici vous implémenterez votre algorithme de matching
    console.log(`⚡ Proposition d'échange reçue de ${proposal.sender}: ${proposal.energy_amount} kWh`);
    
    // Exemple simple: accepter toutes les demandes si nous avons de l'énergie disponible
    // Dans un cas réel, vous auriez une logique plus complexe
    const weHaveExcessEnergy = Math.random() > 0.5; // Simulation
    
    if (proposal.energy_amount < 0 && weHaveExcessEnergy) {
      console.log(`✅ Acceptation de la demande d'échange ${proposal.session_id}`);
      // Implémentez ici la logique d'acceptation
    }
  }

  /**
   * Envoie un message sur le réseau P2P
   * @param message Le message à envoyer
   */
  private sendMessage(message: P2PMessage): void {
    if (!this.ws) {
      console.error("❌ Pas de connexion WebSocket active");
      return;
    }

    try {
      this.ws.send(JSON.stringify(message));
      console.log(`📤 Message envoyé (${message.type}):`, message);
    } catch (error) {
      console.error('❌ Erreur d\'envoi de message:', error);
    }
  }

  /**
   * Génère un identifiant unique pour une session d'échange
   */
  private generateSessionId(): string {
    return crypto.randomUUID();
  }

  /**
   * Ferme la connexion WebSocket
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.stopPeriodicStateSharing();
    }
  }
}