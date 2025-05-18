// src/p2p/server.ts
import fs from 'fs';
import https from 'https';
import path from 'path';
import WebSocket, { WebSocketServer } from 'ws';
import mongoose from 'mongoose';
import { saveP2PMessage } from '../sync/saveP2PMessage';
import { P2PMessage } from './EnergyMessagingService';

// Connexion MongoDB
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://llaouinine:V6Yh16p6kAN4n7eR@cluster0.4htxlff.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB connecté'))
  .catch(err => console.error('Erreur MongoDB:', err));

// Liste des clients connectés pour broadcast
const clients = new Set<WebSocket>();

// Serveur HTTPS avec certif TLS
const server = https.createServer({
  cert: fs.readFileSync(path.join(__dirname, '../../cert/cert.pem')),
  key: fs.readFileSync(path.join(__dirname, '../../cert/key.pem')),
});

const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
  const ip = req.socket.remoteAddress;
  console.log(`Nouveau peer connecté : ${ip}`);
  
  
  clients.add(ws);

  
  ws.send(JSON.stringify({
    type: 'system',
    message: 'Bienvenue sur le réseau P2P de microgrid',
    timestamp: new Date().toISOString()
  }));

  ws.on('message', async (message) => {
    try {
      const msgObj = JSON.parse(message.toString()) as P2PMessage;
      console.log(`Message reçu de type ${msgObj.type} de ${msgObj.sender}`);
      
      
      await saveP2PMessage(msgObj);
      console.log('Message sauvegardé');
      
     
      broadcastMessage(ws, msgObj);
      
      
      ws.send(JSON.stringify({ 
        type: 'system',
        status: 'received', 
        message_type: msgObj.type,
        timestamp: new Date().toISOString() 
      }));
    } catch (err) {
      console.error('Erreur traitement message:', err);
      ws.send(JSON.stringify({ 
        type: 'system',
        status: 'error', 
        message: 'Format de message invalide',
        timestamp: new Date().toISOString() 
      }));
    }
  });

  ws.on('close', () => {
    console.log(`Peer déconnecté: ${ip}`);
    clients.delete(ws);
  });

  ws.on('error', (error) => {
    console.error(`Erreur WebSocket: ${error}`);
    clients.delete(ws);
  });
});

function broadcastMessage(sender: WebSocket, message: P2PMessage): void {
  const messageStr = JSON.stringify(message);
  clients.forEach(client => {
    if (client !== sender && client.readyState === WebSocket.OPEN) {
      client.send(messageStr);
    }
  });
}

const PORT = process.env.P2P_PORT || 8443;
server.listen(PORT, () => {
  console.log(`Serveur P2P sécurisé lancé sur https://localhost:${PORT}`);
});

export default server;