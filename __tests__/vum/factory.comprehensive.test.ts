/**
 * @jest-environment jsdom
 */

import { createLuaComponent, BridgeConfig } from '../../template/vum/factory';
import { VumComponent } from '../../template/vum/Vum';
import { eventBridge } from '../../template/vum/events';

// Mock the eventBridge
jest.mock('../../template/vum/events', () => ({
  eventBridge: {
    sendToLua: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn()
  }
}));

// Define test types
type TestProps = {
  title: string;
  count: number;
  onClick?: () => void;
};

type LuaProps = {
  title: string;
  count: number;
};

describe('Vum Component Factory', () => {
  let config: BridgeConfig<TestProps, LuaProps>;
  let ComponentClass: any;
  let onMountMock: jest.Mock;
  let onUnmountMock: jest.Mock;
  let eventHandlerMock: jest.Mock;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mocks
    onMountMock = jest.fn();
    onUnmountMock = jest.fn();
    eventHandlerMock = jest.fn();
    
    // Setup standard config for tests
    config = {
      componentName: 'TestComponent',
      luaModule: 'vue-ui.components.test_component',
      mapProps: (props: TestProps): LuaProps => ({
        title: props.title,
        count: props.count
      }),
      onMount: onMountMock,
      onUnmount: onUnmountMock,
      fallback: (props: TestProps) => [
        `Title: ${props.title}`,
        `Count: ${props.count}`
      ],
      events: {
        'click': eventHandlerMock
      }
    };
    
    // Create the component class using the factory
    ComponentClass = createLuaComponent(config);
  });
  
  test('createLuaComponent should return a valid VumComponent class', () => {
    expect(ComponentClass.__isVum).toBe(true);
    expect(ComponentClass.prototype).toBeInstanceOf(VumComponent);
  });
  
  test('Component constructor should call onMount', () => {
    // Create a spy on the onMount method
    const onMountSpy = jest.spyOn(ComponentClass.prototype, 'onMount');
    
    // Create component instance
    const component = new ComponentClass({ title: 'Test', count: 5 });
    
    // Verify onMount was called
    expect(onMountSpy).toHaveBeenCalled();
  });
  
  test('onMount should register events and call custom onMount handler', () => {
    // Create component instance
    const component = new ComponentClass({ title: 'Test', count: 5 });
    
    // Verify Lua mount event was sent
    expect(eventBridge.sendToLua).toHaveBeenCalledWith(
      'mount',
      component.id,
      expect.objectContaining({
        component_type: 'test_component',
        module: 'vue-ui.components.test_component',
        title: 'Test',
        count: 5
      })
    );
    
    // Verify event handlers are registered
    expect(eventBridge.on).toHaveBeenCalledWith(
      `click:${component.id}`,
      expect.any(Function)
    );
    
    // Verify custom onMount handler was called
    expect(onMountMock).toHaveBeenCalledWith(component);
  });
  
  test('onMount should handle function luaModule', () => {
    // Create config with function luaModule
    const functionModuleConfig = {
      ...config,
      luaModule: (props: TestProps) => `vue-ui.components.${props.title.toLowerCase()}`
    };
    
    // Create component class and instance
    const FuncModuleClass = createLuaComponent(functionModuleConfig);
    const component = new FuncModuleClass({ title: 'Button', count: 1 });
    
    // Verify correct module name was used
    expect(eventBridge.sendToLua).toHaveBeenCalledWith(
      'mount',
      component.id,
      expect.objectContaining({
        module: 'vue-ui.components.button'
      })
    );
  });
  
  test('onUnmount should clean up subscriptions and call custom handler', () => {
    // Create component instance
    const component = new ComponentClass({ title: 'Test', count: 5 });
    
    // Manually call onUnmount (normally called by dispose)
    component.onUnmount();
    
    // Verify event handlers are unregistered
    expect(eventBridge.off).toHaveBeenCalledWith(`click:${component.id}`);
    
    // Verify unmount event was sent to Lua
    expect(eventBridge.sendToLua).toHaveBeenCalledWith(
      'unmount',
      component.id,
      expect.objectContaining({
        module: 'vue-ui.components.test_component'
      })
    );
    
    // Verify custom onUnmount handler was called
    expect(onUnmountMock).toHaveBeenCalledWith(component);
  });
  
  test('onUnmount should handle function luaModule', () => {
    // Create config with function luaModule
    const functionModuleConfig = {
      ...config,
      luaModule: (props: TestProps) => `vue-ui.components.${props.title.toLowerCase()}`
    };
    
    // Create component class and instance
    const FuncModuleClass = createLuaComponent(functionModuleConfig);
    const component = new FuncModuleClass({ title: 'Button', count: 1 });
    
    // Clear mocks before onUnmount
    jest.clearAllMocks();
    
    // Call onUnmount
    component.onUnmount();
    
    // Verify correct module name was used
    expect(eventBridge.sendToLua).toHaveBeenCalledWith(
      'unmount',
      component.id,
      expect.objectContaining({
        module: 'vue-ui.components.button'
      })
    );
  });
  
  test('registered event handlers should forward events to handlers', () => {
    // Create component instance
    const component = new ComponentClass({ title: 'Test', count: 5 });
    
    // Find the registered event handler (capture the callback function)
    const clickHandler = (eventBridge.on as jest.Mock).mock.calls.find(
      call => call[0] === `click:${component.id}`
    )[1];
    
    // Simulate an event from Lua
    const eventPayload = { x: 10, y: 20 };
    clickHandler(eventPayload);
    
    // Verify event handler was called with component and payload
    expect(eventHandlerMock).toHaveBeenCalledWith(component, eventPayload);
  });
  
  test('render should return fallback content', () => {
    // Create component instance
    const component = new ComponentClass({ title: 'Test', count: 5 });
    
    // Call render
    const result = component.render();
    
    // Verify fallback content is returned
    expect(result.lines).toEqual([
      'Title: Test',
      'Count: 5'
    ]);
  });
  
  test('should work without custom handlers and events', () => {
    // Create minimal config
    const minimalConfig = {
      componentName: 'MinimalComponent',
      luaModule: 'vue-ui.minimal',
      mapProps: (props: TestProps): LuaProps => ({
        title: props.title,
        count: props.count
      }),
      fallback: (props: TestProps) => [`${props.title}: ${props.count}`]
    };
    
    // Create component class and instance
    const MinimalClass = createLuaComponent(minimalConfig);
    
    // This should not throw an error
    const component = new MinimalClass({ title: 'Minimal', count: 1 });
    component.onUnmount();
    
    // Render should still work
    expect(component.render().lines).toEqual(['Minimal: 1']);
  });
});
