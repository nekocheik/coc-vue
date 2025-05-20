/**
 * Client robuste pour communiquer avec Neovim
 * Ce client gère efficacement les connexions et les erreurs
 */
import * as net from 'net';

// Types pour améliorer la lisibilité et la maintenance
export interface ComponentConfig {
  id: string;
  [key: string]: any;
}

export interface CommandResponse {
  id: string;
  success: boolean;
  error?: string;
  result?: any;
  state?: any;
  events?: any[];
  message?: string;
}

export class NeovimClient {
  private socket: net.Socket;
  private connected: boolean = false;
  private responseCallbacks: Map<string, (response: any) => void> = new Map();
  private messageQueue: { command: any, resolve: Function, reject: Function }[] = [];
  private processingQueue: boolean = false;
  private connectionPromise: Promise<void> | null = null;
  private static instance: NeovimClient | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 3;

  /**
   * Utiliser un singleton pour éviter les connexions multiples
   */
  public static getInstance(): NeovimClient {
    if (!NeovimClient.instance) {
      NeovimClient.instance = new NeovimClient();
    }
    return NeovimClient.instance;
  }

  private constructor() {
    this.socket = new net.Socket();
    this.setupSocketEventHandlers();
  }

  /**
   * Configurer les gestionnaires d'événements pour le socket
   */
  private setupSocketEventHandlers(): void {
    // Gérer la déconnexion proprement
    this.socket.on('close', () => {
      if (this.connected) {
        if (process.env.VERBOSE_LOGS === 'true') {
          console.log('Connexion au serveur Neovim fermée');
        }
        this.connected = false;
        
        // Tenter une reconnexion automatique si nécessaire
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          if (process.env.VERBOSE_LOGS === 'true') {
            console.log(`Tentative de reconnexion automatique (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
          }
          setTimeout(() => this.connect(), 1000 * this.reconnectAttempts);
        } else {
          // Rejeter toutes les promesses en attente
          this.responseCallbacks.forEach(callback => {
            callback({ success: false, error: 'Connection closed' });
          });
          this.responseCallbacks.clear();
        }
      }
    });
  }

  /**
   * Se connecter au serveur Neovim avec gestion améliorée des erreurs et des retries
   */
  async connect(port: number = 9999, host: string = '127.0.0.1', maxRetries: number = 5): Promise<void> {
    // Si déjà connecté, retourner immédiatement
    if (this.connected) {
      if (process.env.VERBOSE_LOGS === 'true') {
        console.log('Déjà connecté au serveur Neovim');
      }
      return Promise.resolve();
    }
    
    // Si une connexion est en cours, attendre qu'elle se termine
    if (this.connectionPromise) {
      if (process.env.VERBOSE_LOGS === 'true') {
        console.log('Connexion en cours, attente...');
      }
      return this.connectionPromise;
    }
    
    if (process.env.VERBOSE_LOGS === 'true') {
      console.log(`Tentative de connexion au serveur Neovim (${host}:${port})...`);
    }
    
    // Créer un nouveau socket pour éviter les problèmes avec les anciennes connexions
    this.socket = new net.Socket();
    this.setupSocketEventHandlers();
    
    this.connectionPromise = new Promise<void>((resolve, reject) => {
      const tryConnect = (attemptsLeft: number) => {
        // Nettoyer les écouteurs précédents pour éviter les fuites de mémoire
        this.socket.removeAllListeners('connect');
        this.socket.removeAllListeners('error');
        this.socket.removeAllListeners('timeout');
        
        // Définir un timeout pour la connexion
        this.socket.setTimeout(5000);
        
        this.socket.once('timeout', () => {
          if (process.env.VERBOSE_LOGS === 'true') {
            console.log(`Timeout de connexion (tentative ${maxRetries - attemptsLeft + 1}/${maxRetries})`);
          }
          this.socket.destroy();
          
          if (attemptsLeft > 1) {
            const delay = Math.min(1000 * Math.pow(2, maxRetries - attemptsLeft), 5000);
            if (process.env.VERBOSE_LOGS === 'true') {
              console.log(`Nouvelle tentative dans ${delay}ms...`);
            }
            setTimeout(() => tryConnect(attemptsLeft - 1), delay);
          } else {
            this.connectionPromise = null;
            reject(new Error(`Timeout lors de la connexion au serveur Neovim après ${maxRetries} tentatives`));
          }
        });
        
        this.socket.once('connect', () => {
          if (process.env.VERBOSE_LOGS === 'true') {
            console.log('Connecté au serveur Neovim avec succès');
          }
          this.connected = true;
          this.reconnectAttempts = 0;
          this.socket.setTimeout(0); // Désactiver le timeout après connexion
          
          // Configurer le gestionnaire de données
          this.socket.on('data', (data) => {
            try {
              const response = JSON.parse(data.toString());
              const callback = this.responseCallbacks.get(response.id);
              if (callback) {
                callback(response);
                this.responseCallbacks.delete(response.id);
              }
            } catch (err) {
              const errorMsg = err instanceof Error ? err.message : String(err);
              console.error('Erreur lors du traitement de la réponse:', errorMsg);
            }
          });
          
          // Traiter les messages en attente
          this.processQueue();
          
          this.connectionPromise = null;
          resolve();
        });
        
        this.socket.once('error', (err: Error | unknown) => {
          const errorMsg = err instanceof Error ? err.message : String(err);
          if (process.env.VERBOSE_LOGS === 'true') {
            console.log(`Erreur de connexion: ${errorMsg} (tentative ${maxRetries - attemptsLeft + 1}/${maxRetries})`);
          }
          this.socket.destroy();
          
          if (attemptsLeft > 1) {
            // Réessayer avec un délai exponentiel
            const delay = Math.min(1000 * Math.pow(2, maxRetries - attemptsLeft), 5000);
            if (process.env.VERBOSE_LOGS === 'true') {
              console.log(`Nouvelle tentative dans ${delay}ms...`);
            }
            setTimeout(() => tryConnect(attemptsLeft - 1), delay);
          } else {
            this.connectionPromise = null;
            reject(new Error(`Échec de connexion au serveur Neovim après ${maxRetries} tentatives: ${errorMsg}`));
          }
        });
        
        // Tenter de se connecter
        if (process.env.VERBOSE_LOGS === 'true') {
          console.log(`Tentative de connexion ${maxRetries - attemptsLeft + 1}/${maxRetries}...`);
        }
        try {
          this.socket.connect(port, host);
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          console.error(`Erreur lors de la tentative de connexion: ${errorMsg}`);
          this.socket.emit('error', err);
        }
      };
      
      tryConnect(maxRetries);
    });
    
    return this.connectionPromise;
  }

  /**
   * Traiter la file d'attente des messages
   */
  private async processQueue() {
    if (this.processingQueue || this.messageQueue.length === 0) {
      return;
    }
    
    this.processingQueue = true;
    
    while (this.messageQueue.length > 0) {
      const { command, resolve, reject } = this.messageQueue.shift()!;
      
      try {
        const result = await this.sendCommandInternal(command);
        resolve(result);
      } catch (err) {
        reject(err);
      }
    }
    
    this.processingQueue = false;
  }

  /**
   * Envoyer une commande au serveur Neovim
   */
  private async sendCommandInternal(command: any): Promise<CommandResponse> {
    return new Promise((resolve, reject) => {
      if (!this.connected) {
        if (process.env.VERBOSE_LOGS === 'true') {
          console.log('Tentative d\'envoi de commande sans connexion active');
        }
        reject(new Error('Non connecté au serveur Neovim'));
        return;
      }

      // Générer un ID unique pour la commande
      const id = Date.now().toString() + Math.random().toString(36).substring(2, 9);
      command.id = id;
      
      // Log de débogage pour la commande
      const commandType = command.type || 'unknown';
      if (process.env.VERBOSE_LOGS === 'true') {
        console.log(`Envoi de commande: ${commandType} (ID: ${id})`);
      }
      
      // Définir un timeout pour éviter les attentes infinies (15 secondes)
      const timeout = setTimeout(() => {
        if (process.env.VERBOSE_LOGS === 'true') {
          console.log(`TIMEOUT: Aucune réponse reçue pour la commande ${commandType} (ID: ${id}) après 15 secondes`);
        }
        this.responseCallbacks.delete(id);
        reject(new Error(`Timeout lors de l'attente de la réponse à la commande: ${commandType}`));
      }, 15000);
      
      this.responseCallbacks.set(id, (response) => {
        clearTimeout(timeout);
        if (process.env.VERBOSE_LOGS === 'true') {
          console.log(`Réponse reçue pour la commande ${commandType} (ID: ${id}): ${response.success ? 'succès' : 'échec'}`);
        }
        
        if (response.success) {
          resolve(response);
        } else {
          const errorMsg = response.error || 'Erreur inconnue';
          if (process.env.VERBOSE_LOGS === 'true') {
            console.log(`Erreur pour la commande ${commandType}: ${errorMsg}`);
          }
          reject(new Error(errorMsg));
        }
      });
      
      try {
        const jsonCommand = JSON.stringify(command);
        this.socket.write(jsonCommand, (err) => {
          if (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            if (process.env.VERBOSE_LOGS === 'true') {
              console.log(`Erreur lors de l'envoi de la commande ${commandType}: ${errorMsg}`);
            }
            clearTimeout(timeout);
            this.responseCallbacks.delete(id);
            reject(err);
          }
        });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        if (process.env.VERBOSE_LOGS === 'true') {
          console.log(`Exception lors de l'envoi de la commande ${commandType}: ${errorMsg}`);
        }
        clearTimeout(timeout);
        this.responseCallbacks.delete(id);
        reject(err);
      }
    });
  }

  /**
   * Envoyer une commande au serveur Neovim avec mise en file d'attente
   */
  async sendCommand(command: any): Promise<CommandResponse> {
    // Si non connecté, tenter de se reconnecter automatiquement
    if (!this.connected) {
      try {
        await this.connect();
      } catch (err) {
        return Promise.reject(err);
      }
    }
    
    return new Promise((resolve, reject) => {
      this.messageQueue.push({ command, resolve, reject });
      
      if (this.connected && !this.processingQueue) {
        this.processQueue();
      }
    });
  }

  /**
   * Vérifier si le serveur est en vie
   */
  async ping(): Promise<boolean> {
    try {
      const response = await this.sendCommand({ type: 'ping' });
      return response.success && response.message === 'pong';
    } catch (err) {
      return false;
    }
  }

  /**
   * Charger un composant dans l'instance Neovim
   */
  async loadComponent(config: ComponentConfig): Promise<string> {
    const response = await this.sendCommand({
      type: 'load_component',
      config
    });
    
    return response.id;
  }

  /**
   * Appeler une méthode sur un composant
   */
  async callMethod(componentId: string, method: string, ...args: any[]): Promise<any> {
    const response = await this.sendCommand({
      type: 'call_method',
      id: componentId,
      method,
      args
    });
    
    return response.result;
  }

  /**
   * Obtenir l'état d'un composant
   */
  async getState(componentId: string): Promise<any> {
    const response = await this.sendCommand({
      type: 'get_state',
      id: componentId
    });
    
    return response.state;
  }

  /**
   * Obtenir les événements capturés
   */
  async getEvents(): Promise<any[]> {
    const response = await this.sendCommand({
      type: 'get_events'
    });
    
    return response.events || [];
  }

  /**
   * Se déconnecter du serveur Neovim
   */
  disconnect(): void {
    if (this.connected) {
      if (process.env.VERBOSE_LOGS === 'true') {
        console.log('Déconnexion du serveur Neovim...');
      }
      
      // Rejeter toutes les promesses en attente
      this.responseCallbacks.forEach(callback => {
        callback({ success: false, error: 'Connection closed by client' });
      });
      this.responseCallbacks.clear();
      
      // Nettoyer la file d'attente des messages
      this.messageQueue = [];
      this.processingQueue = false;
      
      try {
        // Fermer proprement la connexion
        this.socket.end();
        this.socket.destroy();
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error(`Erreur lors de la fermeture de la connexion: ${errorMsg}`);
      }
      
      this.connected = false;
      if (process.env.VERBOSE_LOGS === 'true') {
        console.log('Déconnecté du serveur Neovim');
      }
    } else if (process.env.VERBOSE_LOGS === 'true') {
      console.log('Déjà déconnecté du serveur Neovim');
    }
  }
  
  /**
   * Réinitialiser l'instance (utile pour les tests)
   */
  static resetInstance(): void {
    if (process.env.VERBOSE_LOGS === 'true') {
      console.log('Réinitialisation de l\'instance NeovimClient...');
    }
    
    if (NeovimClient.instance) {
      try {
        // Déconnecter proprement
        NeovimClient.instance.disconnect();
        
        // Réinitialiser tous les états internes
        NeovimClient.instance.responseCallbacks.clear();
        NeovimClient.instance.messageQueue = [];
        NeovimClient.instance.processingQueue = false;
        NeovimClient.instance.connectionPromise = null;
        NeovimClient.instance.connected = false;
        
        // Détruire le socket
        if (NeovimClient.instance.socket) {
          NeovimClient.instance.socket.removeAllListeners();
          NeovimClient.instance.socket.destroy();
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error(`Erreur lors de la réinitialisation de l'instance: ${errorMsg}`);
      } finally {
        // Réinitialiser l'instance quoi qu'il arrive
        NeovimClient.instance = null;
        if (process.env.VERBOSE_LOGS === 'true') {
          console.log('Instance NeovimClient réinitialisée');
        }
      }
    } else if (process.env.VERBOSE_LOGS === 'true') {
      console.log('Aucune instance NeovimClient à réinitialiser');
    }
  }
}
