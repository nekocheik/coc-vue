/**
 * Script pour vérifier la disponibilité du serveur de test
 * Ce script tente de se connecter au serveur et de lui envoyer une commande ping
 * pour vérifier qu'il est opérationnel
 */
const net = require('net');

// Fonction pour vérifier si le serveur est accessible et répond correctement
function checkServer() {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    let responseReceived = false;
    
    // Définir un timeout pour la connexion
    socket.setTimeout(2000);
    
    socket.on('timeout', () => {
      socket.destroy();
      reject(new Error('Timeout lors de la tentative de connexion au serveur'));
    });
    
    socket.on('error', (err) => {
      socket.destroy();
      reject(err);
    });
    
    socket.on('connect', () => {
      console.log('Connecté au serveur, envoi d\'une commande ping...');
      
      // Envoyer une commande ping
      const pingCommand = {
        id: `ping_${Date.now()}`,
        type: 'ping'
      };
      
      socket.write(JSON.stringify(pingCommand));
      
      // Attendre la réponse pendant 2 secondes maximum
      setTimeout(() => {
        if (!responseReceived) {
          socket.destroy();
          reject(new Error('Pas de réponse du serveur après l\'envoi de la commande ping'));
        }
      }, 2000);
    });
    
    socket.on('data', (data) => {
      try {
        const response = JSON.parse(data.toString());
        responseReceived = true;
        
        if (response.success && response.message === 'pong') {
          console.log('Serveur opérationnel (réponse pong reçue)');
          socket.end();
          resolve(true);
        } else {
          console.log('Réponse invalide du serveur:', response);
          socket.end();
          reject(new Error('Réponse invalide du serveur'));
        }
      } catch (err) {
        console.error('Erreur lors du traitement de la réponse:', err);
        socket.destroy();
        reject(err);
      }
    });
    
    // Se connecter au serveur
    socket.connect(9999, '127.0.0.1');
  });
}

// Exécuter la vérification
checkServer()
  .then(() => {
    console.log('Le serveur est opérationnel');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Erreur lors de la vérification du serveur:', err.message);
    process.exit(1);
  });
