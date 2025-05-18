// src/sync/saveP2PMessage.ts
import mongoose from 'mongoose';
import { P2PMessage } from '../p2p/EnergyMessagingService';

// Schéma pour les messages P2P
const p2pMessageSchema = new mongoose.Schema({
  type: { type: String, required: true, enum: ['energy_state', 'energy_exchange'] },
  sender: { type: String, required: true },
  timestamp: { type: Date, required: true },
  
  // Champs spécifiques aux messages d'état énergétique
  state_of_charge: { type: Number },
  forecast_production: { type: String },
  forecast_consumption: { type: String },
  
  // Champs spécifiques aux propositions d'échange
  session_id: { type: String },
  energy_amount: { type: Number },
  deadline: { type: Date },
  
  // Métadonnées
  processed: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now }
});

// Créer le modèle s'il n'existe pas déjà
const P2PMessageModel = mongoose.models.P2PMessage || 
  mongoose.model('P2PMessage', p2pMessageSchema);

/**
 * Sauvegarde un message P2P dans la base de données
 * @param message Le message à sauvegarder
 * @returns Promise avec le document sauvegardé
 */
export async function saveP2PMessage(message: P2PMessage): Promise<any> {
  try {
    // Conversion des timestamps string en Date si nécessaire
    const processedMessage = {
      ...message,
      timestamp: new Date(message.timestamp),
      deadline: message.type === 'energy_exchange' && 'deadline' in message 
        ? new Date(message.deadline) 
        : undefined
    };
    
    const newMessage = new P2PMessageModel(processedMessage);
    return await newMessage.save();
  } catch (error) {
    console.error('Erreur de sauvegarde du message P2P:', error);
    throw error;
  }
}

/**
 * Récupère les derniers messages d'état énergétique de chaque microgrid
 * @param limit Nombre maximum de messages à récupérer par microgrid
 * @returns Promise avec les derniers états énergétiques
 */
export async function getLatestEnergyStates(limit = 1): Promise<any[]> {
  try {
    // Grouper par émetteur et récupérer les derniers messages
    const pipeline = [
      { $match: { type: 'energy_state' } },
      { $sort: { timestamp: -1 as 1 | -1 } },
      { $group: {
          _id: '$sender',
          latestState: { $first: '$$ROOT' }
        }
      },
      { $replaceRoot: { newRoot: '$latestState' } }
    ];
    
    return await P2PMessageModel.aggregate(pipeline);
  } catch (error) {
    console.error('Erreur de récupération des états énergétiques:', error);
    throw error;
  }
}

/**
 * Récupère les propositions d'échange actives (non expirées)
 * @returns Promise avec les propositions d'échange actives
 */
export async function getActiveExchangeProposals(): Promise<any[]> {
  try {
    const now = new Date();
    
    return await P2PMessageModel.find({
      type: 'energy_exchange',
      deadline: { $gt: now },
      processed: false
    }).sort({ timestamp: -1 });
  } catch (error) {
    console.error(' Erreur de récupération des propositions d\'échange:', error);
    throw error;
  }
}

export default {
  saveP2PMessage,
  getLatestEnergyStates,
  getActiveExchangeProposals
};