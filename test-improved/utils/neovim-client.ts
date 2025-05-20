/**
 * Client amélioré pour communiquer avec Neovim
 * Ce client réduit les logs et améliore la gestion des connexions
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

  // Utiliser un singleton pour éviter les connexions multiples
  public static getInstance(): NeovimClient {
    if (!NeovimClient.instance) {
      NeovimClient.instance = new NeovimClient();
    }
    return NeovimClient.instance;
  }

  private constructor() {
    this.socket = new net.Socket();
    
    // Gérer la déconnexion proprement
    this.socket.on('close', () => {
      if (this.connected) {
        this.connected = false;
        // Rejeter toutes les promesses en attente
        this.responseCallbacks.forEach(callback => {
          callback({ success: false, error: 'Connection closed' });
        });
        this.responseCallbacks.clear();
      }
    });
  }

  /**
   * Se connecter au serveur Neovim avec gestion améliorée des erreurs et des retries
   */
  async connect(port: number = 9999, host: string = '127.0.0.1', maxRetries: number = 5): Promise<void> {
    // Si déjà connecté, retourner immédiatement
    if (this.connected) {
      return Promise.resolve();
    }
    
    // Si une connexion est en cours, attendre qu'elle se termine
    if (this.connectionPromise) {
      return this.connectionPromise;
    }
    
    this.connectionPromise = new Promise<void>((resolve, reject) => {
      const tryConnect = (attemptsLeft: number) => {
        // Nettoyer les écouteurs précédents pour éviter les fuites de mémoire
        this.socket.removeAllListeners('connect');
        this.socket.removeAllListeners('error');
        
        this.socket.once('connect', () => {
          this.connected = true;
          
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
              console.error('Erreur lors du traitement de la réponse:', err);
            }
          });
          
          // Traiter les messages en attente
          this.processQueue();
          
          this.connectionPromise = null;
          resolve();
        });
        
        this.socket.once('error', (err) => {
          if (attemptsLeft > 0) {
            // Réessayer avec un délai exponentiel
            const delay = Math.min(1000 * Math.pow(2, maxRetries - attemptsLeft), 5000);
            setTimeout(() => tryConnect(attemptsLeft - 1), delay);
          } else {
            this.connectionPromise = null;
            reject(new Error(`Échec de connexion au serveur Neovim: ${err.message}`));
          }
        });
        
        // Tenter de se connecter
        this.socket.connect(port, host);
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
        reject(new Error('Non connecté au serveur Neovim'));
        return;
      }

      // Générer un ID unique pour la commande
      const id = Date.now().toString() + Math.random().toString(36).substring(2, 9);
      command.id = id;
      
      // Définir un timeout pour éviter les attentes infinies
      const timeout = setTimeout(() => {
        this.responseCallbacks.delete(id);
        reject(new Error(`Timeout lors de l'attente de la réponse à la commande: ${JSON.stringify(command)}`));
      }, 10000);
      
      this.responseCallbacks.set(id, (response) => {
        clearTimeout(timeout);
        if (response.success) {
          resolve(response);
        } else {
          reject(new Error(response.error || 'Erreur inconnue'));
        }
      });
      
      try {
        this.socket.write(JSON.stringify(command));
      } catch (err) {
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
      this.socket.end();
      this.connected = false;
    }
  }
  
  /**
   * Réinitialiser l'instance (utile pour les tests)
   */
  static resetInstance(): void {
    if (NeovimClient.instance) {
      NeovimClient.instance.disconnect();
      NeovimClient.instance = null;
    }
  }
}
