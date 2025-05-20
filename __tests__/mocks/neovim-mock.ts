/**
 * Mock pour Neovim
 * Ce fichier fournit des mocks pour les fonctionnalités de Neovim utilisées dans les tests
 */

// Mock pour le client Neovim
export class NeovimClientMock {
  private static instance: NeovimClientMock | null = null;
  private connected: boolean = false;
  private components: Map<string, any> = new Map();
  
  // Singleton pattern
  public static getInstance(): NeovimClientMock {
    if (!NeovimClientMock.instance) {
      NeovimClientMock.instance = new NeovimClientMock();
    }
    return NeovimClientMock.instance;
  }
  
  // Réinitialiser l'instance (utile pour les tests)
  public static resetInstance(): void {
    NeovimClientMock.instance = null;
  }
  
  // Simuler la connexion au serveur Neovim
  public async connect(): Promise<void> {
    this.connected = true;
    console.log('Mock: Connected to Neovim server');
    return Promise.resolve();
  }
  
  // Simuler la déconnexion du serveur Neovim
  public async disconnect(): Promise<void> {
    this.connected = false;
    console.log('Mock: Disconnected from Neovim server');
    return Promise.resolve();
  }
  
  // Vérifier si le client est connecté
  public isConnected(): boolean {
    return this.connected;
  }
  
  // Simuler l'appel d'une fonction Lua
  public async callFunction(functionName: string, args: any[]): Promise<any> {
    console.log(`Mock: Calling function ${functionName} with args:`, args);
    
    // Simuler différentes fonctions Lua
    switch (functionName) {
      case 'create_component':
        return this.mockCreateComponent(args[0], args[1]);
      case 'get_component_state':
        return this.mockGetComponentState(args[0]);
      case 'call_component_method':
        return this.mockCallComponentMethod(args[0], args[1], args[2]);
      case 'update_component_props':
        return this.mockUpdateComponentProps(args[0], args[1]);
      case 'destroy_component':
        return this.mockDestroyComponent(args[0]);
      default:
        console.log(`Mock: Unknown function ${functionName}`);
        return null;
    }
  }
  
  // Mock pour la création de composant
  private mockCreateComponent(componentType: string, props: any): any {
    const componentId = `mock-${componentType}-${Date.now()}`;
    
    // Créer un composant mock selon le type
    let component: any;
    
    switch (componentType) {
      case 'select':
        component = {
          id: componentId,
          type: componentType,
          props: { ...props },
          state: {
            isOpen: false,
            selectedOption: null,
            focusedIndex: -1,
            options: props.options || [],
            disabled: props.disabled || false,
            multiSelect: props.multiSelect || false,
            selectedOptions: []
          }
        };
        break;
      default:
        component = {
          id: componentId,
          type: componentType,
          props: { ...props },
          state: {}
        };
    }
    
    // Stocker le composant
    this.components.set(componentId, component);
    
    return { success: true, componentId, error: null };
  }
  
  // Mock pour obtenir l'état d'un composant
  private mockGetComponentState(componentId: string): any {
    const component = this.components.get(componentId);
    
    if (!component) {
      return { success: false, state: null, error: 'Component not found' };
    }
    
    return { success: true, state: component.state, error: null };
  }
  
  // Mock pour appeler une méthode sur un composant
  private mockCallComponentMethod(componentId: string, method: string, args: any[]): any {
    const component = this.components.get(componentId);
    
    if (!component) {
      return { success: false, result: null, error: 'Component not found' };
    }
    
    // Simuler différentes méthodes selon le type de composant
    if (component.type === 'select') {
      switch (method) {
        case 'open':
          component.state.isOpen = true;
          return { success: true, result: true, error: null };
        case 'close':
          component.state.isOpen = false;
          return { success: true, result: true, error: null };
        case 'focus_option':
          const index = args[0];
          if (index >= 0 && index < component.state.options.length) {
            component.state.focusedIndex = index;
            return { success: true, result: true, error: null };
          }
          return { success: false, result: null, error: 'Invalid option index' };
        case 'select_option':
          const optionIndex = args[0];
          if (optionIndex >= 0 && optionIndex < component.state.options.length) {
            const option = component.state.options[optionIndex];
            if (component.state.multiSelect) {
              // Mode multi-select
              const existingIndex = component.state.selectedOptions.findIndex(
                (o: any) => o.value === option.value
              );
              
              if (existingIndex >= 0) {
                // Désélectionner si déjà sélectionné
                component.state.selectedOptions.splice(existingIndex, 1);
              } else {
                // Ajouter à la sélection
                component.state.selectedOptions.push(option);
              }
            } else {
              // Mode sélection simple
              component.state.selectedOption = option;
            }
            return { success: true, result: option, error: null };
          }
          return { success: false, result: null, error: 'Invalid option index' };
        case 'select_by_value':
          const value = args[0];
          const option = component.state.options.find((o: any) => o.value === value);
          if (option) {
            if (component.state.multiSelect) {
              const existingIndex = component.state.selectedOptions.findIndex(
                (o: any) => o.value === value
              );
              
              if (existingIndex >= 0) {
                component.state.selectedOptions.splice(existingIndex, 1);
              } else {
                component.state.selectedOptions.push(option);
              }
            } else {
              component.state.selectedOption = option;
            }
            return { success: true, result: option, error: null };
          }
          return { success: false, result: null, error: 'Option with value not found' };
        default:
          return { success: false, result: null, error: `Method ${method} not implemented` };
      }
    }
    
    return { success: false, result: null, error: `Component type ${component.type} not supported` };
  }
  
  // Mock pour mettre à jour les propriétés d'un composant
  private mockUpdateComponentProps(componentId: string, newProps: any): any {
    const component = this.components.get(componentId);
    
    if (!component) {
      return { success: false, error: 'Component not found' };
    }
    
    // Mettre à jour les props
    component.props = { ...component.props, ...newProps };
    
    // Mettre à jour l'état en fonction des nouvelles props
    if (newProps.options) {
      component.state.options = newProps.options;
    }
    
    if (newProps.disabled !== undefined) {
      component.state.disabled = newProps.disabled;
    }
    
    if (newProps.multiSelect !== undefined) {
      component.state.multiSelect = newProps.multiSelect;
      if (newProps.multiSelect && !component.state.selectedOptions) {
        component.state.selectedOptions = [];
      }
    }
    
    return { success: true, error: null };
  }
  
  // Mock pour détruire un composant
  private mockDestroyComponent(componentId: string): any {
    if (!this.components.has(componentId)) {
      return { success: false, error: 'Component not found' };
    }
    
    this.components.delete(componentId);
    return { success: true, error: null };
  }
}

// Exporter le mock du client Neovim
export const NeovimClient = NeovimClientMock;
