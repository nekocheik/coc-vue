/**
 * Port manager for tests
 * This module handles dynamic port allocation for test servers
 * Enhanced version with robust error handling and conflict management
 */
const fs = require('fs');
const path = require('path');
const net = require('net');
const os = require('os');
const { execSync, exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Configuration
const PORT_RANGE_START = 9100;
const PORT_RANGE_END = 9999;
const PORT_FILE = path.join(__dirname, '../.test-ports.json');
const LOCK_FILE = path.join(__dirname, '../.port-manager.lock');
const PORT_ALLOCATION_RETRIES = 10;
const PORT_CHECK_TIMEOUT = 1000; // ms

// Activer le mode verbeux si la variable d'environnement est définie
const VERBOSE = process.env.VERBOSE_LOGS === 'true';

// Fonction pour journaliser avec horodatage
function log(message, isError = false) {
  const timestamp = new Date().toISOString();
  const logMessage = `[PortManager ${timestamp}] ${message}`;
  
  if (isError) {
    console.error(logMessage);
  } else if (VERBOSE) {
    console.log(logMessage);
  }
}

// Créer un verrou pour éviter les accès concurrents
function acquireLock(retries = 10, delay = 200) {
  return new Promise((resolve, reject) => {
    const tryAcquire = (attempt) => {
      try {
        // Vérifier si le verrou existe
        if (fs.existsSync(LOCK_FILE)) {
          try {
            // Vérifier si le verrou est périmé (plus de 30 secondes)
            const stats = fs.statSync(LOCK_FILE);
            const lockAge = Date.now() - stats.mtimeMs;
            
            // Lire le contenu du verrou pour obtenir des informations sur le processus qui le détient
            let lockInfo = {};
            try {
              const lockContent = fs.readFileSync(LOCK_FILE, 'utf8');
              lockInfo = JSON.parse(lockContent);
            } catch (readErr) {
              // Si on ne peut pas lire le verrou, on suppose qu'il est corrompu
              log(`Verrou corrompu détecté, suppression...`);
              try {
                fs.unlinkSync(LOCK_FILE);
              } catch (unlinkErr) {
                // Ignorer les erreurs lors de la suppression
              }
            }
            
            // Vérifier si le processus qui détient le verrou est toujours en cours d'exécution
            if (lockInfo.pid) {
              try {
                process.kill(lockInfo.pid, 0); // Vérifie si le processus existe sans l'arrêter
                
                // Le processus existe toujours
                if (lockAge > 30000) {
                  // Mais le verrou est périmé, on le supprime
                  log(`Verrou périmé détecté (${Math.round(lockAge / 1000)}s), suppression...`);
                  try {
                    fs.unlinkSync(LOCK_FILE);
                  } catch (unlinkErr) {
                    // Ignorer les erreurs lors de la suppression
                  }
                } else if (attempt < retries) {
                  // Le verrou est valide et récent, on attend et on réessaie
                  if (VERBOSE) {
                    log(`Verrou détenu par le processus ${lockInfo.pid}, attente (tentative ${attempt + 1}/${retries})...`);
                  }
                  setTimeout(() => tryAcquire(attempt + 1), delay);
                  return;
                } else {
                  return reject(new Error(`Impossible d'acquérir le verrou après ${retries} tentatives, détenu par le processus ${lockInfo.pid}`));
                }
              } catch (e) {
                // Le processus n'existe plus, on supprime le verrou
                log(`Verrou détenu par un processus ${lockInfo.pid} qui n'existe plus, suppression...`);
                try {
                  fs.unlinkSync(LOCK_FILE);
                } catch (unlinkErr) {
                  // Ignorer les erreurs lors de la suppression
                }
              }
            } else if (lockAge > 10000) {
              // Verrou sans PID et ancien, on le supprime
              log(`Verrou sans PID et ancien (${Math.round(lockAge / 1000)}s), suppression...`);
              try {
                fs.unlinkSync(LOCK_FILE);
              } catch (unlinkErr) {
                // Ignorer les erreurs lors de la suppression
              }
            } else if (attempt < retries) {
              // Verrou sans PID mais récent, on attend et on réessaie
              setTimeout(() => tryAcquire(attempt + 1), delay);
              return;
            } else {
              return reject(new Error(`Impossible d'acquérir le verrou après ${retries} tentatives`));
            }
          } catch (statErr) {
            // Erreur lors de la vérification du verrou, on suppose qu'il est corrompu
            log(`Erreur lors de la vérification du verrou: ${statErr.message}, suppression...`);
            try {
              fs.unlinkSync(LOCK_FILE);
            } catch (unlinkErr) {
              // Ignorer les erreurs lors de la suppression
            }
          }
        }
        
        // Créer le verrou
        const lockData = {
          pid: process.pid,
          hostname: os.hostname(),
          timestamp: Date.now(),
          user: os.userInfo().username
        };
        
        try {
          fs.writeFileSync(LOCK_FILE, JSON.stringify(lockData, null, 2));
          if (VERBOSE) {
            log(`Verrou acquis par le processus ${process.pid}`);
          }
          resolve();
        } catch (writeErr) {
          if (attempt < retries) {
            log(`Erreur lors de l'écriture du verrou: ${writeErr.message}, nouvelle tentative...`);
            setTimeout(() => tryAcquire(attempt + 1), delay);
          } else {
            reject(new Error(`Erreur lors de l'écriture du verrou: ${writeErr.message}`));
          }
        }
      } catch (err) {
        if (attempt < retries) {
          // Attendre et réessayer
          setTimeout(() => tryAcquire(attempt + 1), delay);
        } else {
          reject(new Error(`Erreur lors de l'acquisition du verrou: ${err.message}`));
        }
      }
    };
    
    tryAcquire(0);
  });
}

// Libérer le verrou
function releaseLock() {
  try {
    if (fs.existsSync(LOCK_FILE)) {
      // Vérifier si le verrou appartient à ce processus
      try {
        const lockContent = fs.readFileSync(LOCK_FILE, 'utf8');
        const lockInfo = JSON.parse(lockContent);
        
        if (lockInfo.pid === process.pid) {
          // Le verrou appartient à ce processus, on peut le supprimer
          fs.unlinkSync(LOCK_FILE);
          if (VERBOSE) {
            log(`Verrou libéré par le processus ${process.pid}`);
          }
        } else {
          // Le verrou appartient à un autre processus, ne pas le supprimer
          log(`Tentative de libération d'un verrou appartenant au processus ${lockInfo.pid} par le processus ${process.pid}`, true);
        }
      } catch (readErr) {
        // Si on ne peut pas lire le verrou, on suppose qu'il est corrompu et on le supprime
        log(`Verrou corrompu détecté lors de la libération, suppression...`);
        try {
          fs.unlinkSync(LOCK_FILE);
        } catch (unlinkErr) {
          // Ignorer les erreurs lors de la suppression
        }
      }
    }
  } catch (err) {
    log(`Erreur lors de la libération du verrou: ${err.message}`, true);
  }
}

// Initialiser le fichier de ports s'il n'existe pas
async function initPortFile() {
  try {
    await acquireLock();
    
    if (!fs.existsSync(PORT_FILE)) {
      log('Création du fichier de ports...');
      fs.writeFileSync(PORT_FILE, JSON.stringify({
        activePorts: {},
        usedPorts: [],
        lastUpdated: Date.now()
      }, null, 2));
    }
  } catch (err) {
    log(`Erreur lors de l'initialisation du fichier de ports: ${err.message}`, true);
  } finally {
    releaseLock();
  }
}

// Initialiser le fichier de ports au démarrage
initPortFile();

/**
 * Vérifier si un port est disponible
 * @param {number} port - Port à vérifier
 * @returns {Promise<boolean>} - True si le port est disponible
 */
function isPortAvailable(port) {
  return new Promise((resolve) => {
    // Ajouter un timeout pour éviter de bloquer indéfiniment
    const timeout = setTimeout(() => {
      // Si le timeout est atteint, considérer que le port n'est pas disponible
      try {
        if (server) server.close();
      } catch (err) {
        // Ignorer les erreurs lors de la fermeture
      }
      log(`Timeout atteint lors de la vérification du port ${port}`, true);
      resolve(false);
    }, PORT_CHECK_TIMEOUT);
    
    const server = net.createServer();
    
    server.once('error', (err) => {
      clearTimeout(timeout);
      if (VERBOSE) {
        log(`Port ${port} n'est pas disponible: ${err.message}`);
      }
      resolve(false);
    });
    
    server.once('listening', () => {
      clearTimeout(timeout);
      server.close();
      if (VERBOSE) {
        log(`Port ${port} est disponible`);
      }
      resolve(true);
    });
    
    try {
      server.listen(port);
    } catch (err) {
      clearTimeout(timeout);
      log(`Erreur lors de l'ouverture du port ${port}: ${err.message}`, true);
      resolve(false);
    }
  });
}

/**
 * Vérifier si un port est utilisé par un processus système
 * @param {number} port - Port à vérifier
 * @returns {Promise<boolean>} - True si le port est utilisé
 */
async function isPortUsedBySystem(port) {
  try {
    // Utiliser lsof pour vérifier si le port est utilisé
    const command = `lsof -i :${port} -t`;
    const result = execSync(command, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    
    // Si un résultat est retourné, le port est utilisé
    return result.trim().length > 0;
  } catch (err) {
    // Si lsof retourne une erreur, cela signifie généralement qu'aucun processus n'utilise ce port
    return false;
  }
}

/**
 * Trouver un port disponible dans la plage spécifiée
 * @returns {Promise<number>} - Port disponible
 */
async function findAvailablePort() {
  try {
    await acquireLock();
    
    // Lire les ports déjà utilisés
    let portData;
    try {
      portData = JSON.parse(fs.readFileSync(PORT_FILE, 'utf8'));
    } catch (err) {
      // Si le fichier est corrompu ou n'existe pas, le réinitialiser
      log(`Erreur lors de la lecture du fichier de ports, réinitialisation: ${err.message}`, true);
      portData = {
        activePorts: {},
        usedPorts: [],
        lastUpdated: Date.now()
      };
      fs.writeFileSync(PORT_FILE, JSON.stringify(portData, null, 2));
    }
    
    const activePorts = Object.keys(portData.activePorts).map(Number);
    const usedPorts = portData.usedPorts.map(info => info.port);
    
    // Créer une liste de ports à éviter
    const portsToAvoid = new Set([...activePorts, ...usedPorts]);
    
    // Fonction pour vérifier si un port est vraiment disponible
    async function isPortReallyAvailable(port) {
      // Vérifier d'abord si le port est utilisé par le système
      if (await isPortUsedBySystem(port)) {
        if (VERBOSE) log(`Port ${port} est utilisé par le système`);
        return false;
      }
      
      // Ensuite, vérifier si le port est disponible pour l'écoute
      if (!await isPortAvailable(port)) {
        if (VERBOSE) log(`Port ${port} n'est pas disponible pour l'écoute`);
        return false;
      }
      
      return true;
    }
    
    // Essayer des ports aléatoires dans la plage
    const attemptedPorts = new Set();
    for (let attempt = 0; attempt < PORT_ALLOCATION_RETRIES; attempt++) {
      // Générer un port aléatoire dans la plage
      let port;
      let attempts = 0;
      do {
        port = Math.floor(Math.random() * (PORT_RANGE_END - PORT_RANGE_START + 1)) + PORT_RANGE_START;
        attempts++;
      } while (portsToAvoid.has(port) || attemptedPorts.has(port) && attempts < 20);
      
      // Marquer ce port comme tenté
      attemptedPorts.add(port);
      
      if (VERBOSE) log(`Tentative d'allocation du port ${port} (tentative ${attempt + 1}/${PORT_ALLOCATION_RETRIES})`);
      
      // Vérifier si le port est vraiment disponible
      if (await isPortReallyAvailable(port)) {
        log(`Port ${port} alloué avec succès`);
        return port;
      }
    }
    
    // Si on n'a pas trouvé de port après plusieurs tentatives, essayer séquentiellement
    log(`Aucun port aléatoire disponible, recherche séquentielle...`, true);
    for (let port = PORT_RANGE_START; port <= PORT_RANGE_END; port++) {
      if (!portsToAvoid.has(port) && await isPortReallyAvailable(port)) {
        log(`Port ${port} alloué après recherche séquentielle`);
        return port;
      }
    }
    
    throw new Error('Impossible de trouver un port disponible dans la plage spécifiée');
  } catch (err) {
    log(`Erreur lors de la recherche d'un port disponible: ${err.message}`, true);
    throw err;
  } finally {
    releaseLock();
  }
}

/**
 * Allouer un port pour un service spécifique
 * @param {string} serviceName - Nom du service qui utilisera le port
 * @param {number} [preferredPort] - Port préféré (optionnel)
 * @returns {Promise<number>} - Port alloué
 */
async function allocatePort(serviceName, preferredPort = null) {
  try {
    // Vérifier si le service a déjà un port alloué
    const existingPort = await getServicePort(serviceName);
    if (existingPort) {
      log(`Le service "${serviceName}" utilise déjà le port ${existingPort}`);
      return existingPort;
    }
    
    // Si un port préféré est spécifié, vérifier s'il est disponible
    if (preferredPort) {
      // Vérifier si le port est dans la plage autorisée
      if (preferredPort < PORT_RANGE_START || preferredPort > PORT_RANGE_END) {
        log(`Le port préféré ${preferredPort} est en dehors de la plage autorisée (${PORT_RANGE_START}-${PORT_RANGE_END})`, true);
      } else {
        // Vérifier si le port est disponible
        if (await isPortAvailable(preferredPort) && !await isPortUsedBySystem(preferredPort)) {
          // Allouer le port préféré
          await registerPort(preferredPort, serviceName);
          log(`Port préféré ${preferredPort} alloué pour le service "${serviceName}"`);
          return preferredPort;
        } else {
          log(`Le port préféré ${preferredPort} n'est pas disponible, recherche d'une alternative...`);
        }
      }
    }
    
    // Trouver un port disponible
    const port = await findAvailablePort();
    
    // Enregistrer le port
    await registerPort(port, serviceName);
    
    log(`Port ${port} alloué pour le service "${serviceName}"`);
    return port;
  } catch (err) {
    log(`Erreur lors de l'allocation du port pour "${serviceName}": ${err.message}`, true);
    throw err;
  }
}

/**
 * Enregistrer un port comme étant utilisé par un service
 * @param {number} port - Port à enregistrer
 * @param {string} serviceName - Nom du service
 * @returns {Promise<void>}
 */
async function registerPort(port, serviceName) {
  try {
    await acquireLock();
    
    // Lire le fichier de ports
    let portData;
    try {
      portData = JSON.parse(fs.readFileSync(PORT_FILE, 'utf8'));
    } catch (err) {
      // Si le fichier est corrompu ou n'existe pas, le réinitialiser
      portData = {
        activePorts: {},
        usedPorts: [],
        lastUpdated: Date.now()
      };
    }
    
    // Enregistrer le port
    portData.activePorts[port] = {
      service: serviceName,
      pid: process.pid,
      hostname: os.hostname(),
      timestamp: Date.now(),
      user: os.userInfo().username
    };
    
    // Mettre à jour le timestamp
    portData.lastUpdated = Date.now();
    
    // Écrire les modifications
    fs.writeFileSync(PORT_FILE, JSON.stringify(portData, null, 2));
  } catch (err) {
    log(`Erreur lors de l'enregistrement du port ${port}: ${err.message}`, true);
    throw err;
  } finally {
    releaseLock();
  }
}

/**
 * Libérer un port spécifique
 * @param {number} port - Port à libérer
 * @returns {Promise<boolean>} - True si le port a été libéré avec succès
 */
async function releasePort(port) {
  try {
    await acquireLock();
    
    // Lire le fichier de ports
    let portData;
    try {
      portData = JSON.parse(fs.readFileSync(PORT_FILE, 'utf8'));
    } catch (err) {
      log(`Erreur lors de la lecture du fichier de ports: ${err.message}`, true);
      return false;
    }
    
    // Vérifier si le port est actif
    if (portData.activePorts[port]) {
      const portInfo = portData.activePorts[port];
      
      // Déplacer le port de activePorts vers usedPorts
      portData.usedPorts.push({
        port,
        ...portInfo,
        releasedAt: Date.now(),
        releasedBy: process.pid
      });
      
      // Limiter la taille de l'historique des ports utilisés
      if (portData.usedPorts.length > 100) {
        portData.usedPorts = portData.usedPorts.slice(-100);
      }
      
      // Supprimer le port des ports actifs
      delete portData.activePorts[port];
      
      // Mettre à jour le timestamp
      portData.lastUpdated = Date.now();
      
      // Écrire les modifications
      fs.writeFileSync(PORT_FILE, JSON.stringify(portData, null, 2));
      
      log(`Port ${port} libéré (service: ${portInfo.service})`);
      return true;
    } else {
      if (VERBOSE) {
        log(`Port ${port} n'est pas actif, rien à libérer`);
      }
      return false;
    }
  } catch (err) {
    log(`Erreur lors de la libération du port ${port}: ${err.message}`, true);
    return false;
  } finally {
    releaseLock();
  }
}

/**
 * Libérer tous les ports alloués par le processus actuel
 * @returns {Promise<number>} - Nombre de ports libérés
 */
async function releaseAllPortsForCurrentProcess() {
  try {
    await acquireLock();
    
    // Lire le fichier de ports
    let portData;
    try {
      portData = JSON.parse(fs.readFileSync(PORT_FILE, 'utf8'));
    } catch (err) {
      log(`Erreur lors de la lecture du fichier de ports: ${err.message}`, true);
      return 0;
    }
    
    // Trouver tous les ports alloués par ce processus
    const currentPid = process.pid;
    const portsToRelease = [];
    
    for (const [port, info] of Object.entries(portData.activePorts)) {
      if (info.pid === currentPid) {
        portsToRelease.push(parseInt(port, 10));
      }
    }
    
    // Libérer chaque port
    let releasedCount = 0;
    for (const port of portsToRelease) {
      const portInfo = portData.activePorts[port];
      
      // Déplacer le port de activePorts vers usedPorts
      portData.usedPorts.push({
        port,
        ...portInfo,
        releasedAt: Date.now(),
        releasedBy: currentPid
      });
      
      // Supprimer le port des ports actifs
      delete portData.activePorts[port];
      releasedCount++;
      
      log(`Port ${port} libéré (service: ${portInfo.service})`);
    }
    
    // Limiter la taille de l'historique des ports utilisés
    if (portData.usedPorts.length > 100) {
      portData.usedPorts = portData.usedPorts.slice(-100);
    }
    
    // Mettre à jour le timestamp
    portData.lastUpdated = Date.now();
    
    // Écrire les modifications si des ports ont été libérés
    if (releasedCount > 0) {
      fs.writeFileSync(PORT_FILE, JSON.stringify(portData, null, 2));
      log(`${releasedCount} port(s) libéré(s) pour le processus ${currentPid}`);
    } else if (VERBOSE) {
      log(`Aucun port à libérer pour le processus ${currentPid}`);
    }
    
    return releasedCount;
  } catch (err) {
    log(`Erreur lors de la libération des ports pour le processus actuel: ${err.message}`, true);
    return 0;
  } finally {
    releaseLock();
  }
}

/**
 * Obtenir le port actif pour un service spécifique
 * @param {string} serviceName - Nom du service
 * @returns {Promise<number|null>} - Port utilisé par le service ou null si non trouvé
 */
async function getServicePort(serviceName) {
  try {
    await acquireLock();
    
    let portData;
    try {
      portData = JSON.parse(fs.readFileSync(PORT_FILE, 'utf8'));
    } catch (err) {
      log(`Erreur lors de la lecture du fichier de ports: ${err.message}`, true);
      return null;
    }
    
    // Rechercher le service dans les ports actifs
    for (const [port, info] of Object.entries(portData.activePorts)) {
      if (info.service === serviceName) {
        const portNumber = parseInt(port, 10);
        
        // Vérifier si le port est toujours disponible
        if (await isPortUsedBySystem(portNumber)) {
          // Vérifier si le processus qui a alloué le port est toujours en cours d'exécution
          try {
            process.kill(info.pid, 0); // Vérifie si le processus existe sans l'arrêter
            return portNumber;
          } catch (e) {
            // Le processus n'existe plus, marquer le port comme libéré
            log(`Le processus ${info.pid} qui utilisait le port ${portNumber} n'existe plus, libération du port...`);
            await releasePort(portNumber);
            return null;
          }
        } else {
          // Le port n'est plus utilisé par le système, le libérer
          log(`Le port ${portNumber} n'est plus utilisé par le système, libération...`);
          await releasePort(portNumber);
          return null;
        }
      }
    }
    
    return null;
  } catch (err) {
    log(`Erreur lors de la recherche du port pour le service ${serviceName}: ${err.message}`, true);
    return null;
  } finally {
    releaseLock();
  }
}

/**
 * Tuer tous les processus utilisant des ports actifs
 * @returns {Promise<number>} - Nombre de ports libérés
 */
async function killAllActivePorts() {
  try {
    await acquireLock();
    
    let portData;
    try {
      portData = JSON.parse(fs.readFileSync(PORT_FILE, 'utf8'));
    } catch (err) {
      log(`Erreur lors de la lecture du fichier de ports: ${err.message}`, true);
      return 0;
    }
    
    const activePorts = Object.keys(portData.activePorts).map(Number);
    
    if (activePorts.length === 0) {
      log('Aucun port actif à libérer');
      return 0;
    }
    
    log(`Libération de ${activePorts.length} ports actifs...`);
    
    let releasedCount = 0;
    for (const port of activePorts) {
      try {
        // Vérifier si le port est utilisé par un processus
        const portInfo = portData.activePorts[port];
        
        // Tuer les processus utilisant ce port
        try {
          const output = execSync(`lsof -i :${port} -t`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
          if (output) {
            const pids = output.split('\n');
            for (const pid of pids) {
              try {
                const pidNum = parseInt(pid, 10);
                log(`Tentative d'arrêt du processus ${pidNum} utilisant le port ${port}...`);
                
                // Essayer d'abord un arrêt propre
                process.kill(pidNum, 'SIGTERM');
                
                // Attendre un peu et vérifier si le processus est toujours en cours d'exécution
                await new Promise(resolve => setTimeout(resolve, 500));
                
                try {
                  process.kill(pidNum, 0);
                  // Le processus est toujours en cours d'exécution, utiliser SIGKILL
                  log(`Le processus ${pidNum} n'a pas répondu à SIGTERM, utilisation de SIGKILL...`);
                  process.kill(pidNum, 'SIGKILL');
                } catch (e) {
                  // Le processus a été arrêté avec succès
                  log(`Processus ${pidNum} arrêté avec succès`);
                }
              } catch (killErr) {
                log(`Erreur lors de la tentative d'arrêt du processus ${pid}: ${killErr.message}`, true);
              }
            }
          }
        } catch (lsofErr) {
          // Ignorer les erreurs de lsof (aucun processus trouvé)
        }
        
        // Marquer le port comme libéré
        await releasePort(port);
        releasedCount++;
      } catch (err) {
        log(`Erreur lors de la libération du port ${port}: ${err.message}`, true);
      }
    }
    
    log(`${releasedCount} port(s) libéré(s) avec succès`);
    return releasedCount;
  } catch (err) {
    log(`Erreur lors de la libération des ports actifs: ${err.message}`, true);
    return 0;
  } finally {
    releaseLock();
  }
}

/**
 * Nettoyer tous les ports (actifs et utilisés)
 * @returns {Promise<boolean>} - True si le nettoyage a réussi
 */
async function cleanupAllPorts() {
  try {
    // Tuer tous les processus utilisant des ports actifs
    await killAllActivePorts();
    
    // Acquérir le verrou pour réinitialiser le fichier
    await acquireLock();
    
    // Réinitialiser le fichier de ports
    fs.writeFileSync(PORT_FILE, JSON.stringify({
      activePorts: {},
      usedPorts: [],
      lastUpdated: Date.now(),
      cleanedAt: Date.now(),
      cleanedBy: {
        pid: process.pid,
        hostname: os.hostname(),
        user: os.userInfo().username
      }
    }, null, 2));
    
    log('Tous les ports ont été nettoyés');
    return true;
  } catch (err) {
    log(`Erreur lors du nettoyage des ports: ${err.message}`, true);
    return false;
  } finally {
    releaseLock();
  }
}

/**
 * Vérifier l'état du gestionnaire de ports
 * @returns {Promise<Object>} - État du gestionnaire de ports
 */
async function getPortManagerStatus() {
  try {
    await acquireLock();
    
    let portData;
    try {
      portData = JSON.parse(fs.readFileSync(PORT_FILE, 'utf8'));
    } catch (err) {
      return {
        status: 'error',
        error: `Erreur lors de la lecture du fichier de ports: ${err.message}`,
        timestamp: Date.now()
      };
    }
    
    const activePorts = Object.keys(portData.activePorts).map(Number);
    const activePortsInfo = {};
    
    // Vérifier l'état de chaque port actif
    for (const port of activePorts) {
      const info = portData.activePorts[port];
      let processStatus = 'unknown';
      
      try {
        process.kill(info.pid, 0);
        processStatus = 'running';
      } catch (e) {
        processStatus = 'terminated';
      }
      
      activePortsInfo[port] = {
        ...info,
        processStatus,
        age: Math.floor((Date.now() - info.timestamp) / 1000) // en secondes
      };
    }
    
    return {
      status: 'ok',
      activePorts: Object.keys(portData.activePorts).length,
      usedPorts: portData.usedPorts.length,
      activePortsInfo,
      lastUpdated: portData.lastUpdated,
      timestamp: Date.now()
    };
  } catch (err) {
    return {
      status: 'error',
      error: `Erreur lors de la vérification de l'état du gestionnaire de ports: ${err.message}`,
      timestamp: Date.now()
    };
  } finally {
    releaseLock();
  }
}

// Configurer le gestionnaire de processus pour libérer les ports à la sortie
process.on('exit', () => {
  try {
    // Libérer tous les ports alloués par ce processus
    // Utiliser execSync car on ne peut pas utiliser async dans le gestionnaire 'exit'
    const currentPid = process.pid;
    try {
      if (fs.existsSync(PORT_FILE)) {
        const portData = JSON.parse(fs.readFileSync(PORT_FILE, 'utf8'));
        let released = false;
        
        for (const [port, info] of Object.entries(portData.activePorts)) {
          if (info.pid === currentPid) {
            // Déplacer le port vers usedPorts
            portData.usedPorts.push({
              port: parseInt(port, 10),
              ...info,
              releasedAt: Date.now(),
              releasedBy: currentPid,
              reason: 'process_exit'
            });
            
            // Supprimer le port des ports actifs
            delete portData.activePorts[port];
            released = true;
          }
        }
        
        if (released) {
          fs.writeFileSync(PORT_FILE, JSON.stringify(portData, null, 2));
        }
      }
    } catch (err) {
      // Ignorer les erreurs lors de la sortie
    }
  } catch (err) {
    // Ignorer les erreurs lors de la sortie
  }
});

// Exporter les fonctions
module.exports = {
  // Fonctions principales
  allocatePort,
  releasePort,
  getServicePort,
  killAllActivePorts,
  cleanupAllPorts,
  
  // Fonctions utilitaires
  isPortAvailable,
  isPortUsedBySystem,
  releaseAllPortsForCurrentProcess,
  getPortManagerStatus,
  
  // Constantes
  PORT_RANGE_START,
  PORT_RANGE_END
};
