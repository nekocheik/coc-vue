/**
 * Système de journalisation avancé avec niveaux et contextes
 * Facilite le débogage et le suivi des opérations
 */

/**
 * Niveaux de journalisation
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

/**
 * Système de journalisation
 */
export class Logger {
  private static instance: Logger;
  private logLevel: LogLevel = LogLevel.INFO;
  private contexts: Set<string> = new Set();
  private enabled: boolean = true;
  
  private constructor() {}
  
  /**
   * Obtient l'instance singleton
   */
  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }
  
  /**
   * Active ou désactive la journalisation
   */
  enable(enabled: boolean): void {
    this.enabled = enabled;
  }
  
  /**
   * Définit le niveau de journalisation
   */
  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }
  
  /**
   * Ajoute un contexte à filtrer
   */
  addContext(context: string): void {
    this.contexts.add(context);
  }
  
  /**
   * Supprime un contexte
   */
  removeContext(context: string): void {
    this.contexts.delete(context);
  }
  
  /**
   * Efface tous les contextes
   */
  clearContexts(): void {
    this.contexts.clear();
  }
  
  /**
   * Journalise un message de débogage
   */
  debug(context: string, message: string, ...args: any[]): void {
    this.log(LogLevel.DEBUG, context, message, ...args);
  }
  
  /**
   * Journalise un message d'information
   */
  info(context: string, message: string, ...args: any[]): void {
    this.log(LogLevel.INFO, context, message, ...args);
  }
  
  /**
   * Journalise un avertissement
   */
  warn(context: string, message: string, ...args: any[]): void {
    this.log(LogLevel.WARN, context, message, ...args);
  }
  
  /**
   * Journalise une erreur
   */
  error(context: string, message: string, ...args: any[]): void {
    this.log(LogLevel.ERROR, context, message, ...args);
  }
  
  /**
   * Journalise un message
   */
  private log(level: LogLevel, context: string, message: string, ...args: any[]): void {
    // Vérifier si la journalisation est activée
    if (!this.enabled) return;
    
    // Vérifier le niveau de journalisation
    if (level < this.logLevel) return;
    
    // Vérifier si le contexte est filtré
    if (this.contexts.size > 0 && !this.contexts.has(context)) return;
    
    // Formater le message
    const timestamp = new Date().toISOString();
    const levelStr = LogLevel[level].padEnd(5);
    const formattedMessage = `[${timestamp}] [${levelStr}] [${context}] ${message}`;
    
    // Journaliser selon le niveau
    switch (level) {
      case LogLevel.DEBUG:
        console.log(formattedMessage, ...args);
        break;
      case LogLevel.INFO:
        console.info(formattedMessage, ...args);
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage, ...args);
        break;
      case LogLevel.ERROR:
        console.error(formattedMessage, ...args);
        break;
    }
  }
}

// Création d'une instance singleton
export const logger = Logger.getInstance();
