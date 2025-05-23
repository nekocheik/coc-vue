/**
 * Tests for CocBridge module that ensures it correctly interfaces
 * with Coc.nvim workspace, maintains proper event listeners, and
 * exposes appropriate APIs for component to access
 * to Coc.nvim API and provides proper bridging functionality.
 */

// Définir d'abord les mocks avant d'importer les modules réels
const docCallbacks: Array<(doc: { uri: string }) => void> = [];
const workspaceCallbacks: Array<() => void> = [];
const workspaceFolders: Array<{ name: string, uri: string }> = [];

// Mock de coc.nvim
const mockNvim = {
  on: jest.fn(),
  call: jest.fn(),
  command: jest.fn(),
  createOutputChannel: jest.fn().mockReturnValue({
    appendLine: jest.fn(),
    show: jest.fn()
  })
};

// Mock buffer for tests that need it
let mockBuffer = {
  id: 3,
  name: '/test/file.vue',
  lines: ['line1', 'line2']
};

// Définir la propriété buffer avec un getter qui renvoie mockBuffer
Object.defineProperty(mockNvim, 'buffer', {
  get: jest.fn().mockImplementation(() => Promise.resolve(mockBuffer))
});

const mockWorkspace = {
  nvim: mockNvim,
  onDidOpenTextDocument: jest.fn((callback) => {
    docCallbacks.push(callback);
    return () => {};
  }),
  onDidCloseTextDocument: jest.fn(),
  onDidChangeTextDocument: jest.fn(),
  onDidSaveTextDocument: jest.fn(),
  registerAutocmd: jest.fn(),
  get workspaceFolders() { return workspaceFolders; },
  onDidChangeWorkspaceFolders: jest.fn((callback) => {
    workspaceCallbacks.push(callback);
    return () => {};
  })
};

const mockShowErrorMessage = jest.fn();
const mockWindow = { showErrorMessage: mockShowErrorMessage };

const mockExecuteCommand = jest.fn();
const mockCommands = {
  registerCommand: jest.fn(),
  executeCommand: mockExecuteCommand
};

jest.mock('coc.nvim', () => ({
  workspace: mockWorkspace,
  window: mockWindow,
  commands: mockCommands
}));

// Définir les constantes pour le mock du registry
const COMPONENT_ADDED = 'component-added';
const COMPONENT_REMOVED = 'component-removed';

// Mock pour le registry
const registryEventListeners: Record<string, Array<(data: any) => void>> = {};
jest.mock('../../template/registry', () => ({
  componentRegistry: {
    registerComponent: jest.fn(),
    unregisterComponent: jest.fn(),
    getComponentByType: jest.fn(),
    getComponentProps: jest.fn(),
    on: jest.fn((eventType: string, callback: (data: any) => void) => {
      if (!registryEventListeners[eventType]) {
        registryEventListeners[eventType] = [];
      }
      registryEventListeners[eventType].push(callback);
      return () => {};
    }),
    emit: jest.fn()
  },
  RegistryEventType: {
    COMPONENT_ADDED,
    COMPONENT_REMOVED
  }
}));

// Importer les modules après avoir configuré les mocks
import { cocBridge } from '../../template/CocBridge';
import { componentRegistry } from '../../template/registry';
import { RegistryEventType } from '../../template/registry';

// Helpers pour tester
const testHelpers = {
  setWorkspaceFolders: (folders: Array<{ name: string, uri: string }>) => {
    // Vider le tableau
    workspaceFolders.length = 0;
    // Ajouter les nouveaux dossiers
    workspaceFolders.push(...folders);
  },
  triggerDocumentOpen: (uri: string) => {
    docCallbacks.forEach(cb => cb({ uri }));
  },
  triggerWorkspaceChange: () => {
    workspaceCallbacks.forEach(cb => cb());
  },
  triggerRegistryEvent: (eventType: string, data: any) => {
    if (registryEventListeners[eventType]) {
      registryEventListeners[eventType].forEach(cb => cb(data));
    }
  }
};

describe('CocBridge', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });
  
  it('should be initialized as a singleton', () => {
    // Verify that the bridge is initialized
    expect(cocBridge.isInitialized()).toBe(true);
    
    // Vérifions que les fonctions de registration sont disponibles
    expect(typeof cocBridge.on).toBe('function');
    expect(typeof cocBridge.emit).toBe('function');
    expect(typeof cocBridge.registerComponent).toBe('function');
    expect(typeof cocBridge.getComponent).toBe('function');
  });
  
  it('should emit events when coc.nvim events are triggered', () => {
    // Spy on the emit method
    const emitSpy = jest.spyOn(cocBridge, 'emit');
    
    // Trigger document open event
    testHelpers.triggerDocumentOpen('file:///test/path.vue');
    
    // Verify event was emitted with correct parameters
    expect(emitSpy).toHaveBeenCalledWith('bufferChange', 'file:///test/path.vue');
    
    // Trigger workspace change event
    testHelpers.triggerWorkspaceChange();
    
    // Verify event was emitted
    expect(emitSpy).toHaveBeenCalledWith('workspaceChange');
  });
  
  it('should register and track event listeners', () => {
    // Create test event listener
    const mockListener = jest.fn();
    
    // Register event listener
    const unsubscribe = cocBridge.on('testEvent', mockListener);
    
    // Trigger the event
    cocBridge.emit('testEvent', 'test data');
    
    // Verify the listener was called
    expect(mockListener).toHaveBeenCalledWith('test data');
    
    // Unsubscribe
    unsubscribe();
    
    // Trigger again
    cocBridge.emit('testEvent', 'more data');
    
    // Verify it was only called once (before unsubscribe)
    expect(mockListener).toHaveBeenCalledTimes(1);
  });
  
  it('should register and get components', () => {
    // Create test component
    const testComponent = {
      id: 'test-component',
      state: { value: 42 },
      methods: {
        getValue: () => 42
      }
    };
    
    // Register component
    cocBridge.registerComponent('test-component', testComponent);
    
    // Get component
    const retrievedComponent = cocBridge.getComponent('test-component');
    
    // Verify component is retrieved correctly
    expect(retrievedComponent).toBeDefined();
    expect(retrievedComponent?.id).toBe('test-component');
    expect(retrievedComponent?.state.value).toBe(42);
    
    // Call method
    const result = cocBridge.callComponentMethod('test-component', 'getValue');
    expect(result).toBe(42);
    
    // Vérifier que nous recevons undefined pour un ID inexistant
    const nullComponent = cocBridge.getComponent('nonexistentComponent');
    expect(nullComponent).toBeUndefined();
    
    // Tester l'enregistrement d'un composant avec id undefined
    // L'implémentation de CocBridge enregistre effectivement le composant avec cet ID
    const invalidComponent = { id: undefined };
    cocBridge.registerComponent('missing-id-component', invalidComponent as any);
    
    // Vérifier que le composant est bien récupéré avec l'ID utilisé lors de l'enregistrement
    const retrievedInvalidComponent = cocBridge.getComponent('missing-id-component');
    expect(retrievedInvalidComponent).toBe(invalidComponent);
  });
  
  it('should handle registry-style component registration', () => {
    // Directement enregistrer un composant
    cocBridge.registerComponent('registry-component', { id: 'registry-component' });
    
    // Vérifier que le composant est correctement enregistré
    expect(cocBridge.getComponent('registry-component')).toBeDefined();
  });
  
  it('should safely handle errors in event listeners', () => {
    // Mock console.error to verify it's called
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Create a listener that throws an error
    const errorListener = jest.fn().mockImplementation(() => {
      throw new Error('Test error');
    });
    
    // Register error listener
    cocBridge.on('errorEvent', errorListener);
    
    // Emit event - should not throw
    expect(() => cocBridge.emit('errorEvent')).not.toThrow();
    
    // Verify error was logged
    expect(consoleErrorSpy).toHaveBeenCalled();
    
    // Clean up
    consoleErrorSpy.mockRestore();
  });
  
  it('should correctly handle workspace folders', async () => {
    // Test 1: Cas normal avec des dossiers de workspace
    testHelpers.setWorkspaceFolders([
      { name: 'test1', uri: 'file:///test/folder1' },
      { name: 'test2', uri: 'file:///test/folder2' }
    ]);
    
    let folders = await cocBridge.getWorkspaceFolders();
    expect(folders.length).toBe(2);
    expect(folders[0].name).toBe('test1');
    expect(folders[0].path).toContain('/test/folder1');
    
    // Test 2: Pas de dossiers de workspace, utilise getcwd comme fallback
    testHelpers.setWorkspaceFolders([]);
    mockNvim.call = jest.fn().mockResolvedValue('/fallback/dir');
    
    folders = await cocBridge.getWorkspaceFolders();
    expect(folders.length).toBe(1);
    expect(folders[0].path).toBe('/fallback/dir');
    
    // Test 3: Gestion des erreurs
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockNvim.call = jest.fn().mockRejectedValue(new Error('Test error'));
    
    folders = await cocBridge.getWorkspaceFolders();
    expect(folders).toEqual([]);
    expect(consoleErrorSpy).toHaveBeenCalled();
    
    consoleErrorSpy.mockRestore();
  });
  
  it('should open files in the editor', async () => {
    // Test 1: Ouvrir un fichier avec succès
    // Utiliser le mock global déjà configuré
    mockExecuteCommand.mockResolvedValueOnce(undefined);
    
    await cocBridge.openFile('/test/file.txt');
    
    expect(mockExecuteCommand).toHaveBeenCalledWith('vscode.open', '/test/file.txt');
    
    // Test 2: Gérer les erreurs lors de l'ouverture d'un fichier
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Simuler une erreur dans la commande
    mockExecuteCommand.mockImplementationOnce(() => {
      throw new Error('Test error');
    });
    
    await cocBridge.openFile('/error/file.txt');
    
    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(mockShowErrorMessage).toHaveBeenCalled();
    
    consoleErrorSpy.mockRestore();
    mockExecuteCommand.mockReset();
    mockShowErrorMessage.mockReset();
  });
  
  it('should properly get buffer content', async () => {
    // Test 1: Obtenir le contenu du buffer avec succès
    mockNvim.call = jest.fn().mockResolvedValue(['line1', 'line2', 'line3']);
    
    const content = await cocBridge.getBufferContent(1);
    expect(content).toHaveLength(3);
    expect(content[0]).toBe('line1');
    expect(mockNvim.call).toHaveBeenCalled();
    
    // Test 2: Gérer correctement les erreurs
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockNvim.call = jest.fn().mockRejectedValue(new Error('Test error'));
    
    const errorContent = await cocBridge.getBufferContent(2);
    expect(errorContent).toEqual([]);
    expect(consoleErrorSpy).toHaveBeenCalled();
    
    consoleErrorSpy.mockRestore();
  });
  
  it('should correctly get current buffer information', async () => {
    // Test 1: Obtenir les informations du buffer courant avec succès
    // Utiliser la variable mockBuffer définie globalement
    mockBuffer = {
      id: 3,
      name: '/test/file.vue',
      lines: ['line1', 'line2']
    };
    
    const buffer = await cocBridge.getCurrentBuffer();
    
    expect(buffer).toEqual({
      id: 3,
      name: '/test/file.vue',
      content: ['line1', 'line2']
    });
    
    // Test 2: Gérer les erreurs lors de la récupération du buffer
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Simuler une erreur en modifiant l'implémentation du getter
    const bufferGetter = Object.getOwnPropertyDescriptor(mockNvim, 'buffer')?.get as jest.Mock;
    bufferGetter.mockImplementationOnce(() => Promise.reject(new Error('Test error')));
    
    const errorBuffer = await cocBridge.getCurrentBuffer();
    
    expect(errorBuffer).toEqual({
      id: -1,
      name: 'Error',
      content: []
    });
    expect(consoleErrorSpy).toHaveBeenCalled();
    
    consoleErrorSpy.mockRestore();
    // Réinitialiser le mock pour les tests suivants
    bufferGetter.mockImplementation(() => Promise.resolve(mockBuffer));
  });
  
  it('should execute vim commands', async () => {
    // Test 1: Exécuter une commande avec succès
    mockNvim.command = jest.fn().mockResolvedValue(undefined);
    
    await cocBridge.executeVimCommand('echo "test"');
    
    expect(mockNvim.command).toHaveBeenCalledWith('echo "test"');
    
    // Test 2: Gérer les erreurs lors de l'exécution d'une commande
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockNvim.command = jest.fn().mockRejectedValue(new Error('Test error'));
    
    await cocBridge.executeVimCommand('invalid');
    
    expect(consoleErrorSpy).toHaveBeenCalled();
    
    consoleErrorSpy.mockRestore();
  });
  
  it('should list files in a directory', async () => {
    // Test 1: Lister les fichiers avec succès
    // Dans l'implémentation, on vérifie d'abord si le répertoire existe, puis on exécute globpath
    mockNvim.call = jest.fn().mockImplementation((method, args) => {
      if (method === 'isdirectory' && args[0] === '/test/dir') {
        return Promise.resolve(1); // 1 = true en VimScript
      }
      if (method === 'globpath' && args[0] === '.') {
        // Dans la vraie implémentation, globpath a un 4ème paramètre à 1 qui indique de renvoyer une liste
        return Promise.resolve(['file1.txt', 'file2.js', 'subdir/file3.vue']);
      }
      return Promise.resolve(null);
    });
    mockNvim.command = jest.fn().mockResolvedValue(undefined);
    
    const files = await cocBridge.listFiles('/test/dir');
    
    // Vérifier que la méthode retourne correctement le tableau de fichiers
    expect(files).toEqual(['file1.txt', 'file2.js', 'subdir/file3.vue']);
    
    // Test 2: Gérer le cas où le répertoire n'existe pas
    mockNvim.call = jest.fn().mockImplementation((method, args) => {
      if (method === 'isdirectory') {
        return Promise.resolve(0); // 0 = false en VimScript
      }
      return Promise.resolve(null);
    });
    
    const noFiles = await cocBridge.listFiles('/nonexistent/dir');
    expect(noFiles).toEqual([]);
    
    // Test 3: Gérer les erreurs
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockNvim.call = jest.fn().mockRejectedValue(new Error('Test error'));
    
    const errorFiles = await cocBridge.listFiles('/error/dir');
    expect(errorFiles).toEqual([]);
    expect(consoleErrorSpy).toHaveBeenCalled();
    
    consoleErrorSpy.mockRestore();
  });
  
  // Version simplifiée du test pour éviter les problèmes de mémoire
  it('should use alternative method to list files when primary method fails', async () => {
    // Simuler l'existence du répertoire mais un échec lors du changement de répertoire
    mockNvim.call = jest.fn().mockImplementation((method, args) => {
      if (method === 'isdirectory') {
        return Promise.resolve(1); // répertoire existe
      }
      if (method === 'readdir' && args[0] === '/test/dir') {
        // Simuler le résultat de readdir sans récursion
        return Promise.resolve([
          { name: 'file1.txt', type: 'file' },
          { name: 'file2.js', type: 'file' },
          { name: 'subdir', type: 'directory' }
        ]);
      }
      return Promise.resolve([]);
    });
    
    // Simuler l'échec de lcd pour forcer l'utilisation de la méthode alternative
    mockNvim.command = jest.fn().mockRejectedValue(new Error('lcd failed'));
    
    const files = await cocBridge.listFiles('/test/dir');
    
    // Vérifier que la méthode alternative a été utilisée avec les bons arguments
    expect(mockNvim.call).toHaveBeenCalledWith('readdir', ['/test/dir']);
    expect(files).toContain('file1.txt');
    expect(files).toContain('file2.js');
    expect(files).toContain('subdir/');
  });
  
  // Test pour callComponentMethod avec des cas d'erreur
  it('should handle errors when calling component methods', async () => {
    // Créer un composant avec une méthode qui lance une erreur
    const component = { 
      id: 'error-component', 
      methods: { 
        throwError: () => { throw new Error('Test error'); },
        asyncThrowError: () => Promise.reject(new Error('Async error'))
      } 
    };
    cocBridge.registerComponent('error-component', component);
    
    // Espionner console.error
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Appeler une méthode qui n'existe pas
    const result1 = cocBridge.callComponentMethod('error-component', 'nonexistentMethod');
    expect(result1).toBeNull();
    
    // Appeler une méthode qui lance une erreur
    const result2 = cocBridge.callComponentMethod('error-component', 'throwError');
    expect(result2).toBeNull();
    expect(consoleErrorSpy).toHaveBeenCalled();
    
    // Appeler une méthode sur un composant qui n'existe pas
    const result4 = cocBridge.callComponentMethod('nonexistentComponent', 'test');
    expect(result4).toBeNull();
    
    consoleErrorSpy.mockRestore();
  });
  
  // Test pour vérifier la gestion de workspace.workspaceFolders non défini
  it('should handle undefined workspace folders', async () => {
    // Simuler workspace.workspaceFolders qui est undefined
    const originalGetter = Object.getOwnPropertyDescriptor(mockWorkspace, 'workspaceFolders')?.get;
    Object.defineProperty(mockWorkspace, 'workspaceFolders', {
      get: () => undefined
    });
    
    // Espionner console.log pour vérifier les messages
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    
    // Simuler un échec lors de la récupération du répertoire courant
    mockNvim.call = jest.fn().mockRejectedValue(new Error('getcwd failed'));
    
    const folders = await cocBridge.getWorkspaceFolders();
    
    // On devrait obtenir un tableau vide
    expect(folders).toEqual([]);
    
    // Vérifier que les messages de log appropriés ont été émis
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('No workspace folders found'));
    
    consoleLogSpy.mockRestore();
    
    // Rétablir mockWorkspace.workspaceFolders pour les autres tests
    if (originalGetter) {
      Object.defineProperty(mockWorkspace, 'workspaceFolders', {
        get: originalGetter
      });
    }
  });
});
