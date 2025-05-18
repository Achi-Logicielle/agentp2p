import WebSocket from 'ws';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';


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
  private messageHandler: ((message: P2PMessage) => void) | null = null;
  private reconnecting: boolean = false;
  
  constructor(microgridId: string, serverUrl: string = 'wss://localhost:8443') {
    this.microgridId = microgridId;
    this.serverUrl = serverUrl;
  }

  
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        console.log(`Tentative de connexion à ${this.serverUrl}`);
        
        
        if (this.ws) {
          this.ws.terminate();
          this.ws = null;
        }
        
        this.ws = new WebSocket(this.serverUrl, {
          cert: fs.readFileSync(path.join(__dirname, '../../cert/cert.pem')),
          rejectUnauthorized: false, 
          handshakeTimeout: 10000 // 10 seconds timeout for handshake
        });

        // Connection timeout
        const connectTimeout = setTimeout(() => {
          if (this.ws && this.ws.readyState !== WebSocket.OPEN) {
            console.error('⏱️ Connection timeout');
            this.ws.terminate();
            reject(new Error('Connection timeout'));
          }
        }, 15000);

        this.ws.on('open', () => {
          clearTimeout(connectTimeout);
          console.log(`🚀 Microgrid ${this.microgridId} connecté au réseau P2P`);
          this.setupListeners();
          
          
          this.sendMessage({
            type: 'energy_state',
            sender: this.microgridId,
            timestamp: new Date().toISOString(),
            state_of_charge: 50,
            forecast_production: '10.0',
            forecast_consumption: '8.0'
          });
          
          resolve();
        });

        this.ws.on('error', (err) => {
          clearTimeout(connectTimeout);
          console.error('Erreur WebSocket:', err);
          reject(err);
        });
      } catch (error) {
        console.error('Exception lors de la tentative de connexion:', error);
        reject(error);
      }
    });
  }


  private setupListeners(): void {
    if (!this.ws) return;

    this.ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString()) as P2PMessage;
        console.log(`📥 Message reçu de type ${message.type}`);
        
        
        if (this.messageHandler) {
          this.messageHandler(message);
        }
        
        
        if (message.type === 'energy_exchange') {
          this.handleExchangeProposal(message);
        }
      } catch (error) {
        console.error('Erreur de traitement du message:', error);
      }
    });

    this.ws.on('close', (code, reason) => {
      console.log(`Microgrid ${this.microgridId} déconnecté du réseau P2P (${code}: ${reason})`);
      this.stopPeriodicStateSharing();
      if (!this.reconnecting && code !== 1000) {
        this.reconnecting = true;
        console.log('Tentative de reconnexion automatique dans 5 secondes...');
        setTimeout(() => {
          this.reconnecting = false;
          this.connect().catch(err => {
            console.error('Échec de la reconnexion:', err);
          });
        }, 5000);
      }
    });
    
    
    this.ws.on('ping', () => {
      console.log('Ping reçu du serveur');
    });
    
    this.ws.on('pong', () => {
      console.log('📌 Pong reçu du serveur');
    });
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }


  onMessage(handler: (message: P2PMessage) => void): void {
    this.messageHandler = handler;
  }

 
  startPeriodicStateSharing(intervalMs: number = 60000): void {
    
    this.stopPeriodicStateSharing();
    
    
    this.publishEnergyState();
    
    
    this.stateInterval = setInterval(() => {
      this.publishEnergyState();
    }, intervalMs);
  }

  stopPeriodicStateSharing(): void {
    if (this.stateInterval) {
      clearInterval(this.stateInterval);
      this.stateInterval = null;
    }
  }

  
  publishEnergyState(): void {
    if (!this.isConnected()) {
      console.error("Pas de connexion WebSocket active pour publier l'état");
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

  proposeEnergyExchange(energyAmount: number, deadlineMinutes: number = 30): void {
    if (!this.isConnected()) {
      console.error("Pas de connexion WebSocket active pour proposer un échange");
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


  private handleExchangeProposal(proposal: EnergyExchangeProposal): void {
    
    console.log(`⚡ Proposition d'échange reçue de ${proposal.sender}: ${proposal.energy_amount} kWh`);
    
    const weHaveExcessEnergy = Math.random() > 0.5; // Simulation
    
    if (proposal.energy_amount < 0 && weHaveExcessEnergy) {
      console.log(`Acceptation de la demande d'échange ${proposal.session_id}`);
      
    }
  }

  private sendMessage(message: P2PMessage): void {
    if (!this.isConnected()) {
      console.error("Pas de connexion WebSocket active pour envoyer un message");
      return;
    }

    try {
      this.ws!.send(JSON.stringify(message));
      console.log(`Message envoyé (${message.type})`);
    } catch (error) {
      console.error('Erreur d\'envoi de message:', error);
    }
  }

  private generateSessionId(): string {
    return crypto.randomUUID();
  }


  disconnect(): void {
    if (this.ws) {
      console.log('Déconnexion du réseau P2P');
      this.stopPeriodicStateSharing();
      this.ws.close(1000, 'disconnecting normally');
      this.ws = null;
    }
  }
}