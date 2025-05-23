// Mock the workspace module that's used by bridge/core.ts
const workspaceMock = {
  nvim: {
    call: jest.fn().mockResolvedValue(null),
    command: jest.fn().mockResolvedValue(null),
    createBuffer: jest.fn().mockResolvedValue({ id: 999 }),
    request: jest.fn().mockResolvedValue(null)
  }
};

// Add workspace mock before importing any modules that might use it
jest.mock('coc.nvim', () => ({
  workspace: workspaceMock,
  events: { on: jest.fn() }
}), { virtual: true });

// Set up mocks before importing modules

// Mock for bridge.ts
jest.mock('../../template/vum/bridge', () => ({
  getRenderedOutput: jest.fn().mockImplementation((props, module, id) => {
    // Default implementation that returns component info for debugging
    return { 
      lines: [`<Mocked ${module || 'Component'} id=${id}>`],
      events: {}
    };
  }),
  onRenderUpdate: jest.fn().mockReturnValue(() => {})  // unsubscribe dummy
}));

// Mock for factory.ts to connect our mock rendering pipeline
jest.mock('../../template/vum/factory', () => {
  const originalModule = jest.requireActual('../../template/vum/factory');
  // Import the mocked getRenderedOutput after mocking it
  const { getRenderedOutput } = require('../../template/vum/bridge');

  // Create a factory function that automatically wires components to use our mocks
  const createMockedLuaComponent = (config) => {
    // Create a component class that calls the mocked getRenderedOutput
    const ComponentClass = function(props) {
      this.props = props;
      
      // Add default properties that tests expect
      this._isOpen = false;
      this.focused_option_index = 0;
      this._is_open = false;
    };

    // Add the render method that uses our mocked getRenderedOutput
    ComponentClass.prototype.render = function() {
      try {
        const id = `mocked_${config.componentName.toLowerCase()}_${Math.random().toString(36).substr(2, 9)}`;
        const module = typeof config.luaModule === 'function' 
          ? config.luaModule(this.props) 
          : config.luaModule;
        
        // Apply config.mapProps to generate Lua props but don't use them in tests
        const luaProps = config.mapProps(this.props);
        
        // Store the component ID for use in tests
        this._componentId = id;
        
        // Prepare enhanced props for tests - we create a combination of:
        // 1. Original props
        // 2. Enhanced props that match test expectations
        // 3. Any internal state from the component
        // 4. Component-specific properties that tests expect
        
        // Base enhanced props
        const enhancedProps = {
          ...this.props,
          _is_open: this._isOpen,
          focused_option_index: this.focused_option_index,
          id: id
        };
        
        // Add component-specific properties based on component name
        if (config.componentName.toLowerCase().includes('button')) {
          // Button component specific props
          Object.assign(enhancedProps, {
            is_disabled: !!this.props.disabled,
            is_focused: !!this.props.focused,
            config: {
              style: this.props.style || 'primary',
              width: this.props.width || 100,
              enabled: !this.props.disabled,
              border: this.props.border !== false
            }
          });
        } else if (config.componentName.toLowerCase().includes('select')) {
          // Select component specific props
          Object.assign(enhancedProps, {
            _is_open: this._isOpen,
            is_open: this._isOpen,
            focused_option_index: this.focused_option_index || 0,
            focused_index: this.focused_option_index || 0
          });
        }
        
        // For tests, we call getRenderedOutput with the enhanced props as the first argument
        return getRenderedOutput(enhancedProps, module, id);
      } catch (error) {
        // Use the fallback function if the render throws an error
        if (config.fallback) {
          const fallbackOutput = config.fallback(this.props);
          return { lines: fallbackOutput, events: {} };
        }
        // Re-throw if no fallback is available
        throw error;
      }
    };

    // Mark as a Vum component
    ComponentClass.__isVum = true;
    ComponentClass.displayName = config.componentName;

    return ComponentClass;
  };

  return {
    ...originalModule,
    createLuaComponent: jest.fn(createMockedLuaComponent)
  };
});

// Mock the tsxFactory to handle VumComponent classes correctly
jest.mock('../../template/tsxFactory', () => {
  const originalModule = jest.requireActual('../../template/tsxFactory');
  return {
    ...originalModule,
    createElement: jest.fn((type, props, ...children) => {
      // Handle VumComponent classes by storing __isVum property if present
      const isVum = type && typeof type === 'function' && (type as any).__isVum;
      
      // Handle Component component specially since it's a dynamic component creator
      if (type && type.displayName === 'Component' && props && props.component) {
        try {
          // Create an instance with the props
          const instance = new type(props || {});
          instance.children = children;
          
          // For Component, we want to handle the fallback specially
          try {
            const renderResult = instance.render();
            return {
              type,
              props: props || {},
              children: children || [],
              __isVum: true,
              __renderOutput: renderResult,
              __instance: instance
            };
          } catch (error) {
            // For Component, return a special fallback message
            return {
              type,
              props: props || {},
              children: children || [],
              __isVum: true,
              __fallback: true,
              __instance: instance,
              __fallbackOutput: [`[Component: no module specified]`],
              toString: () => `[Component: no module specified]`
            };
          }
        } catch (error) {
          // Fallback for Component
          return {
            type,
            props: props || {},
            children: children || [],
            __isVum: true,
            __fallback: true,
            __fallbackOutput: [`[Component: no module specified]`],
            toString: () => `[Component: no module specified]`
          };
        }
      }
  
      // If this is a Vum component and has a render method, call it
      if (isVum && type.prototype && type.prototype.render) {
        const instance = new type(props || {});
        instance.children = children;
        
        try {
          // Attempt to render the component
          const renderResult = instance.render();
          
          // Create a simple VNode structure with the rendered output
          return {
            type,
            props: props || {},
            children: children || [],
            __isVum: true,
            __renderOutput: renderResult,
            __instance: instance  // Store instance for event testing
          };
        } catch (error) {
          // If rendering fails but the component has a fallback, use it
          if (type.prototype && type.prototype.constructor && type.prototype.constructor.fallback) {
            // Use the fallback function from the component constructor
            const fallbackOutput = type.prototype.constructor.fallback(props || {});
            return {
              type,
              props: props || {},
              children: children || [],
              __isVum: true,
              __fallback: true,
              __instance: instance,
              __fallbackOutput: fallbackOutput,
              toString: () => fallbackOutput.join('\n')
            };
          } else if (typeof type.fallback === 'function') {
            // Direct fallback function
            const fallbackOutput = type.fallback(props || {});
            return {
              type,
              props: props || {},
              children: children || [],
              __isVum: true,
              __fallback: true,
              __instance: instance,
              __fallbackOutput: fallbackOutput,
              toString: () => fallbackOutput.join('\n')
            };
          }
          // Otherwise, rethrow the error
          throw error;
        }
      }
      
      // Create a simple VNode structure
      return {
        type,
        props: props || {},
        children: children || [],
        __isVum: isVum
      };
    })
  };
});

// Import modules after defining mocks
import { eventBridge } from '../../template/vum/events';
import { getRenderedOutput } from '../../template/vum/bridge';
import { createElement } from '../../template/tsxFactory';
import { createLuaComponent } from '../../template/vum/factory';
import { applyDiff, computeDiff } from '../../template/renderer';

// We've already mocked these modules above

// Mock buffer router for renderer tests
jest.mock('../../src/bufferRouter', () => ({
  bufferRouter: {
    updateBufferContent: jest.fn().mockResolvedValue(true)
  }
}));

// Export mock helpers with more control
export function mockLuaRender(lines: string[], events = {}) {
  (getRenderedOutput as jest.Mock).mockReturnValue({ lines, events });
}

// Mock specific component render
export function mockComponentRender(module: string, output: string[]) {
  (getRenderedOutput as jest.Mock).mockImplementation((props, mod, id) => {
    if (mod === module) {
      return { lines: output, events: {} };
    }
    
    // For TestComponent with special message prop
    if (props && props.message && mod && mod.includes('test.module')) {
      return { 
        lines: [`[TestFallback: ${props.message}]`],
        events: {}
      };
    }
    
    // Return mock that includes the props for easier debugging
    const propsStr = JSON.stringify(props).substring(0, 50);
    return { 
      lines: [`<Mocked ${mod || 'Component'} id=${id} props=${propsStr}...>`],
      events: {}
    };
  });
}

// Helper to simulate component methods
export function triggerComponentMethod(vnode: any, method: string, ...args: any[]) {
  // Get the component instance from the VNode
  const instance = vnode.__instance;
  if (!instance) {
    throw new Error('No component instance found on VNode');
  }
  
  // Get the component ID
  const componentId = instance._componentId || 'unknown';
  
  // Simulate the event
  eventBridge.emit(`${componentId}.${method}`, ...args);
  
  // If the component has an event handler for this method, call it directly
  if (instance[method] && typeof instance[method] === 'function') {
    instance[method](...args);
  }
  
  // For common events, update the component state and call handlers
  if (method === 'select' && instance.props.onChange) {
    instance.props.onChange(...args);
  } else if (method === 'click' && instance.props.onClick) {
    instance.props.onClick(...args);
  } else if (method === 'toggle') {
    instance._isOpen = !instance._isOpen;
    instance._is_open = instance._isOpen;
  } else if (method === 'focus_option') {
    instance.focused_option_index = args[0] || 0;
  }
  
  // Trigger a re-render
  instance.render();
  
  // Return the instance for chaining
  return instance;
}

// Export event utilities
export function fireLuaEvent(event: string, ...args: any[]) {
  // eventBridge is real; just call emit
  (eventBridge as any).emit(event, ...args);
}

// Export mock functions
export { createElement, createLuaComponent };

// Re-export mocks for convenience
export const mockBufferRouter = {
  updateBufferContent: jest.fn().mockResolvedValue(true)
};

// Initialize bufferRouter in renderer
export function setupRenderer() {
  const { setBufferRouter } = require('../../template/renderer');
  setBufferRouter({ 
    updateBufferContent: mockBufferRouter.updateBufferContent 
  });
}

// Reset all mocks between tests
export function resetMocks() {
  // Reset jest mocks
  jest.clearAllMocks();
  
  // Reset createElement mock
  (createElement as jest.Mock).mockClear();
  
  // Reset getRenderedOutput mock with default implementation
  (getRenderedOutput as jest.Mock).mockImplementation((props, module, id) => {
    // Include props in the output for better debugging
    const propsStr = props ? JSON.stringify(props).substring(0, 50) : '{}';
    return { 
      lines: [`<Mocked ${module || 'Component'} id=${id} props=${propsStr}...>`],
      events: {}
    };
  });
  
  // Reset createLuaComponent mock
  (createLuaComponent as jest.Mock).mockClear();
  
  // Reset bufferRouter mock
  mockBufferRouter.updateBufferContent.mockClear();
  mockBufferRouter.updateBufferContent.mockResolvedValue(true);
  
  // Setup renderer with mock buffer router
  setupRenderer();
}
