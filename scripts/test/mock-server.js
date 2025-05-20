/**
 * Serveur mock robuste pour les tests d'intégration
 * Ce serveur simule le comportement du serveur Neovim pour les tests
 * Utilise des ports dynamiques pour éviter les conflits
 */
const net = require('net');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const portManager = require('../../test/utils/port-manager');

// Configuration du serveur
const HOST = '127.0.0.1';
let PORT = null;
let serverInfo = null;
let isShuttingDown = false;

// Chemin vers le fichier d'information du serveur
const SERVER_INFO_PATH = path.join(__dirname, '../../test/.server-info.json');

// Activer le mode verbeux si la variable d'environnement est définie
const VERBOSE = process.env.VERBOSE_LOGS === 'true';

// Fonction pour journaliser avec horodatage
function log(message, isError = false) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  
  if (isError) {
    console.error(logMessage);
  } else if (VERBOSE) {
    console.log(logMessage);
  }
}

// Stockage pour les composants et les événements
const components = new Map();
let events = [];

// Créer le serveur TCP
const server = net.createServer((socket) => {
  console.log(`Client connected: ${socket.remoteAddress}:${socket.remotePort}`);
  
  // Gérer les données reçues
  socket.on('data', (data) => {
    try {
      const command = JSON.parse(data.toString());
      console.log(`Command received: ${command.type} (ID: ${command.id})`);
      
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
              component.state.is_open = true;
              component.events.push({ type: 'select:opened', timestamp: Date.now() });
              events.push({ componentId: command.id, type: 'select:opened', timestamp: Date.now() });
              response.result = true;
              break;
              
            case 'close':
              component.state.is_open = false;
              component.events.push({ type: 'select:closed', timestamp: Date.now() });
              events.push({ componentId: command.id, type: 'select:closed', timestamp: Date.now() });
              response.result = true;
              break;
              
            case 'select_option':
              const index = command.args[0];
              if (component.state.options && component.state.options[index]) {
                component.state.selected_index = index;
                component.state.selected_value = component.state.options[index].value;
                component.state.selected_text = component.state.options[index].text;
                
                // En mode multi-sélection, gérer les options sélectionnées
                if (component.state.multi) {
                  component.state.selected_options = component.state.selected_options || [];
                  
                  // Vérifier si l'option est déjà sélectionnée
                  const existingIndex = component.state.selected_options.findIndex(
                    opt => opt.value === component.state.options[index].value
                  );
                  
                  if (existingIndex >= 0) {
                    // Désélectionner l'option
                    component.state.selected_options.splice(existingIndex, 1);
                  } else {
                    // Sélectionner l'option
                    component.state.selected_options.push(component.state.options[index]);
                  }
                } else {
                  // En mode simple, fermer le menu après la sélection
                  component.state.is_open = false;
                }
                
                component.events.push({ 
                  type: 'select:option_selected', 
                  payload: {
                    index,
                    value: component.state.options[index].value,
                    text: component.state.options[index].text
                  },
                  timestamp: Date.now() 
                });
                
                events.push({ 
                  componentId: command.id, 
                  type: 'select:option_selected', 
                  payload: {
                    index,
                    value: component.state.options[index].value,
                    text: component.state.options[index].text
                  },
                  timestamp: Date.now() 
                });
              }
              response.result = true;
              break;
              
            case 'focus_option':
              const focusIndex = command.args[0];
              if (component.state.options && component.state.options[focusIndex]) {
                component.state.focused_index = focusIndex;
              }
              response.result = true;
              break;
              
            case 'focus_next_option':
              if (component.state.options) {
                const currentIndex = component.state.focused_index || 0;
                const nextIndex = Math.min(currentIndex + 1, component.state.options.length - 1);
                component.state.focused_index = nextIndex;
              }
              response.result = true;
              break;
              
            case 'focus_prev_option':
              if (component.state.options) {
                const currentIndex = component.state.focused_index || 0;
                const prevIndex = Math.max(currentIndex - 1, 0);
                component.state.focused_index = prevIndex;
              }
              response.result = true;
              break;
              
            case 'update_options':
              component.state.options = command.args[0];
              response.result = true;
              break;
              
            case 'set_disabled':
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
      console.log(`Response sent: ${response.success ? 'success' : 'failure'}`);
      
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
    console.log(`Client disconnected: ${socket.remoteAddress}:${socket.remotePort}`);
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

// Fonction pour réinitialiser l'état du serveur
function resetServer() {
  components.clear();
  events = [];
  console.log('État du serveur réinitialisé');
}

// Fonction pour démarrer le serveur avec un port dynamique
async function startServer() {
  try {
    // Vérifier si un serveur est déjà en cours d'exécution
    if (fs.existsSync(SERVER_INFO_PATH)) {
      try {
        const existingInfo = JSON.parse(fs.readFileSync(SERVER_INFO_PATH, 'utf8'));
        const existingPid = existingInfo.pid;
        
        // Vérifier si le processus est toujours en cours d'exécution
        try {
          process.kill(existingPid, 0); // Vérifie si le processus existe sans l'arrêter
          log(`Un serveur mock est déjà en cours d'exécution avec PID ${existingPid} sur le port ${existingInfo.port}`);
          
          // Tenter de tuer le processus existant
          try {
            log(`Tentative d'arrêt du serveur existant (PID: ${existingPid})...`);
            process.kill(existingPid, 'SIGTERM');
            
            // Attendre un peu pour s'assurer que le processus est terminé
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Vérifier si le processus est toujours en cours d'exécution
            try {
              process.kill(existingPid, 0);
              log(`Le serveur existant n'a pas pu être arrêté proprement, tentative d'arrêt forcé...`, true);
              process.kill(existingPid, 'SIGKILL');
              await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (e) {
              // Le processus a été arrêté avec succès
              log(`Serveur existant arrêté avec succès`);
            }
          } catch (killErr) {
            log(`Erreur lors de la tentative d'arrêt du serveur existant: ${killErr.message}`, true);
          }
        } catch (e) {
          // Le processus n'existe plus, mais le fichier d'information existe toujours
          log(`Le fichier d'information du serveur existe, mais le processus ${existingPid} n'est plus en cours d'exécution`);
        }
      } catch (parseErr) {
        log(`Erreur lors de la lecture du fichier d'information du serveur: ${parseErr.message}`, true);
      }
      
      // Supprimer le fichier d'information existant
      try {
        fs.unlinkSync(SERVER_INFO_PATH);
        log(`Fichier d'information du serveur supprimé`);
      } catch (unlinkErr) {
        log(`Erreur lors de la suppression du fichier d'information du serveur: ${unlinkErr.message}`, true);
      }
    }
    
    // Allouer un port dynamique
    PORT = await portManager.allocatePort('mock-server');
    log(`Port ${PORT} alloué pour le serveur mock`);
    
    // Démarrer le serveur
    server.listen(PORT, HOST, () => {
      log(`Serveur mock démarré sur ${HOST}:${PORT}`);
      
      // Enregistrer les informations du serveur dans un fichier
      serverInfo = {
        host: HOST,
        port: PORT,
        pid: process.pid,
        startTime: new Date().toISOString(),
        version: '1.0.0',
        components: 0,
        status: 'running'
      };
      
      // Écrire les informations du serveur dans un fichier
      fs.writeFileSync(SERVER_INFO_PATH, JSON.stringify(serverInfo, null, 2));
      log(`Informations du serveur enregistrées dans ${SERVER_INFO_PATH}`);
      
      // Mettre à jour périodiquement les informations du serveur
      setInterval(updateServerInfo, 5000);
    });
  } catch (err) {
    log(`Erreur lors du démarrage du serveur: ${err.message}`, true);
    process.exit(1);
  }
}

// Fonction pour mettre à jour les informations du serveur
function updateServerInfo() {
  if (isShuttingDown) return;
  
  try {
    if (serverInfo) {
      serverInfo.components = components.size;
      serverInfo.lastUpdated = new Date().toISOString();
      serverInfo.uptime = Math.floor((Date.now() - new Date(serverInfo.startTime).getTime()) / 1000);
      
      fs.writeFileSync(SERVER_INFO_PATH, JSON.stringify(serverInfo, null, 2));
      if (VERBOSE) {
        log(`Informations du serveur mises à jour (${components.size} composants actifs)`);
      }
    }
  } catch (err) {
    log(`Erreur lors de la mise à jour des informations du serveur: ${err.message}`, true);
  }
}

// Démarrer le serveur
startServer();

// Fonction pour arrêter proprement le serveur
function shutdownServer(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  
  log(`Reçu signal ${signal}, arrêt du serveur mock...`);
  
  // Mettre à jour le statut du serveur
  if (serverInfo) {
    serverInfo.status = 'shutting_down';
    try {
      fs.writeFileSync(SERVER_INFO_PATH, JSON.stringify(serverInfo, null, 2));
    } catch (err) {
      // Ignorer les erreurs lors de la mise à jour du statut
    }
  }
  
  // Fermer le serveur
  server.close(() => {
    // Libérer le port
    if (PORT) {
      portManager.releasePort(PORT);
      log(`Port ${PORT} libéré`);
    }
    
    // Supprimer le fichier d'information du serveur
    try {
      if (fs.existsSync(SERVER_INFO_PATH)) {
        fs.unlinkSync(SERVER_INFO_PATH);
        log(`Fichier d'information du serveur supprimé`);
      }
    } catch (err) {
      log(`Erreur lors de la suppression du fichier d'information du serveur: ${err.message}`, true);
    }
    
    log('Serveur mock arrêté proprement.');
    process.exit(0);
  });
  
  // S'assurer que le processus se termine même si server.close() est bloqué
  setTimeout(() => {
    log('Arrêt forcé du serveur après timeout...', true);
    process.exit(1);
  }, 5000);
}

// Gérer les signaux de sortie
process.on('SIGINT', () => shutdownServer('SIGINT'));
process.on('SIGTERM', () => shutdownServer('SIGTERM'));

// Gérer la sortie en cas d'erreur
process.on('uncaughtException', (err) => {
  log(`Erreur non gérée: ${err.message}`, true);
  shutdownServer('uncaughtException');
});

// Gérer la sortie en cas de promesse rejetée non gérée
process.on('unhandledRejection', (reason, promise) => {
  log('Promesse rejetée non gérée:', true);
  log(reason instanceof Error ? reason.stack : String(reason), true);
  shutdownServer('unhandledRejection');
});

// Vérifier l'état du serveur
function checkServerHealth() {
  return {
    status: 'healthy',
    components: components.size,
    uptime: serverInfo ? Math.floor((Date.now() - new Date(serverInfo.startTime).getTime()) / 1000) : 0,
    port: PORT,
    host: HOST
  };
}

// Exposer une API pour les tests
module.exports = {
  resetServer,
  getServerInfo: () => serverInfo,
  checkServerHealth
};

// Journaliser un message de démarrage
log('Serveur mock en cours de démarrage...');
