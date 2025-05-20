/**
 * Serveur mock pour les tests d'intégration
 * Ce serveur simule le comportement du serveur Neovim pour les tests
 */
const net = require('net');

// Configuration du serveur
const PORT = 9999;
const HOST = '127.0.0.1';

// Stockage pour les composants et les événements
const components = new Map();
let events = [];

// Créer le serveur TCP
const server = net.createServer((socket) => {
  console.log(`Client connecté: ${socket.remoteAddress}:${socket.remotePort}`);
  
  // Gérer les données reçues
  socket.on('data', (data) => {
    try {
      const command = JSON.parse(data.toString());
      console.log(`Commande reçue: ${command.type} (ID: ${command.id})`);
      
      // Traiter la commande
      let response = {
        id: command.id,
        success: true
      };
      
      switch (command.type) {
        case 'ping':
          response.message = 'pong';
          break;
          
        case 'load_component':
          const componentId = command.config.id || `component_${Date.now()}`;
          components.set(componentId, {
            id: componentId,
            config: command.config,
            state: { ...command.config },
            events: []
          });
          response.id = componentId;
          break;
          
        case 'call_method':
          const component = components.get(command.id);
          if (!component) {
            response.success = false;
            response.error = `Composant non trouvé: ${command.id}`;
            break;
          }
          
          // Simuler différentes méthodes
          switch (command.method) {
            case 'mount':
              component.state.mounted = true;
              response.result = true;
              break;
              
            case 'unmount':
              component.state.mounted = false;
              response.result = true;
              break;
              
            case 'open':
              component.state.isOpen = true;
              component.events.push({ type: 'open', timestamp: Date.now() });
              events.push({ componentId: command.id, type: 'open', timestamp: Date.now() });
              response.result = true;
              break;
              
            case 'close':
              component.state.isOpen = false;
              component.events.push({ type: 'close', timestamp: Date.now() });
              events.push({ componentId: command.id, type: 'close', timestamp: Date.now() });
              response.result = true;
              break;
              
            case 'select':
              const index = command.args[0];
              if (component.state.options && component.state.options[index]) {
                component.state.selectedIndex = index;
                component.state.selectedOption = component.state.options[index];
                component.events.push({ 
                  type: 'select', 
                  value: component.state.options[index],
                  timestamp: Date.now() 
                });
                events.push({ 
                  componentId: command.id, 
                  type: 'select', 
                  value: component.state.options[index],
                  timestamp: Date.now() 
                });
              }
              response.result = true;
              break;
              
            case 'updateOptions':
              component.state.options = command.args[0];
              response.result = true;
              break;
              
            case 'setDisabled':
              component.state.disabled = command.args[0];
              response.result = true;
              break;
              
            default:
              response.success = false;
              response.error = `Méthode non supportée: ${command.method}`;
          }
          break;
          
        case 'get_state':
          const comp = components.get(command.id);
          if (!comp) {
            response.success = false;
            response.error = `Composant non trouvé: ${command.id}`;
            break;
          }
          response.state = comp.state;
          break;
          
        case 'get_events':
          response.events = events;
          break;
          
        default:
          response.success = false;
          response.error = `Type de commande non supporté: ${command.type}`;
      }
      
      // Envoyer la réponse
      socket.write(JSON.stringify(response));
      console.log(`Réponse envoyée: ${response.success ? 'succès' : 'échec'}`);
      
    } catch (err) {
      console.error(`Erreur lors du traitement de la commande: ${err.message}`);
      socket.write(JSON.stringify({
        id: 'error',
        success: false,
        error: err.message
      }));
    }
  });
  
  // Gérer la déconnexion
  socket.on('close', () => {
    console.log(`Client déconnecté: ${socket.remoteAddress}:${socket.remotePort}`);
  });
  
  // Gérer les erreurs
  socket.on('error', (err) => {
    console.error(`Erreur de socket: ${err.message}`);
  });
});

// Gérer les erreurs du serveur
server.on('error', (err) => {
  console.error(`Erreur du serveur: ${err.message}`);
  if (err.code === 'EADDRINUSE') {
    console.error(`Le port ${PORT} est déjà utilisé. Arrêtez tout processus existant sur ce port.`);
    process.exit(1);
  }
});

// Démarrer le serveur
server.listen(PORT, HOST, () => {
  console.log(`Serveur mock démarré sur ${HOST}:${PORT}`);
});

// Gérer la sortie propre
process.on('SIGINT', () => {
  console.log('Arrêt du serveur mock...');
  server.close(() => {
    console.log('Serveur mock arrêté.');
    process.exit(0);
  });
});

// Maintenir le serveur en vie
console.log('Serveur mock en attente de connexions...');
