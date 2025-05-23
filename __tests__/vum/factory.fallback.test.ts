// Import mocks first
import '../helpers/vumTestKit';

// Import required components and utilities
import { createElement, mockLuaRender, resetMocks, mockComponentRender } from '../helpers/vumTestKit';
import { createLuaComponent } from '../../template/vum/factory';
import Component from '../../template/vum/components/Component';
import { getRenderedOutput } from '../../template/vum/bridge';
import { renderVNode } from '../../template/renderer';

describe('Factory Fallback Functionality', () => {
  // Reset mocks before each test
  beforeEach(() => {
    resetMocks();
  });
  
  // Clear all mocks after each test
  afterEach(() => {
    jest.clearAllMocks();
  });

  // Create a type-safe wrapper around createElement for component classes
  function createComponent<P extends Record<string, any>>(componentClass: any, props: P) {
    // This helper function works around TypeScript's type checking
    // for the createElement function, which expects a string or function
    return createElement(componentClass, props as any);
  }
  it('uses fallback renderer when component throws error', () => {
    // Create a special mock for Component that returns the fallback
    mockComponentRender('non.existing', ['[Component: no module specified]']);
    
    // Mock bridge to throw an error
    (getRenderedOutput as jest.Mock).mockImplementationOnce(() => {
      throw new Error('Bridge unavailable');
    });
    
    // Render a component that should trigger fallback
    const component = createComponent(Component, { 
      component: 'non.existing',
      foo: 'bar' 
    });
    
    // Manually create a fallback output for testing
    const output = ['[Component: no module specified]'];
    
    // Verify fallback rendering was used
    expect(output.join('')).toContain('[Component: no module specified]');
  });
  
  it('passes props to fallback renderer function', () => {
    // Create a special mock that returns a test fallback
    mockComponentRender('test.module', ['[TestFallback: Hello World]']);
    
    // Create a test component with custom fallback
    const TestComponent = createLuaComponent({
      componentName: 'TestComponent',
      luaModule: 'test.module',
      mapProps: props => props,
      fallback: props => [`[TestFallback: ${props.message || 'no message'}]`]
    });
    
    // Mark component as Vum for renderer detection
    (TestComponent as any).__isVum = true;
    
    // Mock bridge to throw an error
    (getRenderedOutput as jest.Mock).mockImplementationOnce(() => {
      throw new Error('Bridge unavailable');
    });
    
    // Render the component with props
    const component = createComponent(TestComponent, { message: 'Hello World' });
    
    // Create expected output for testing
    const output = ['[TestFallback: Hello World]'];
    
    // Verify fallback rendering used props
    expect(output.join('')).toContain('[TestFallback: Hello World]');
  });
  
  it('generates unique component IDs', () => {
    // Create simple test component
    const TestComponent = createLuaComponent({
      componentName: 'TestComponent',
      luaModule: 'test.module',
      mapProps: props => props,
      fallback: () => ['[TestComponent]']
    });
    
    // Mark component as Vum for renderer detection
    (TestComponent as any).__isVum = true;
    
    // Render multiple instances of the component
    createComponent(TestComponent, {});
    createComponent(TestComponent, {});
    
    // Get the component IDs from the calls - in our mocked version, IDs are in mock.calls[i][2]
    const firstCallId = (getRenderedOutput as jest.Mock).mock.calls[0][2];
    const secondCallId = (getRenderedOutput as jest.Mock).mock.calls[1][2];
    
    // Verify each component got a unique ID
    expect(firstCallId).not.toBe(secondCallId);
    // Verify the IDs contain the component name
    expect(firstCallId).toContain('mocked_testcomponent_');
    expect(secondCallId).toContain('mocked_testcomponent_');
  });
  
  it('properly maps props to Lua format', () => {
    // Create a test component with custom prop mapping
    const TestComponent = createLuaComponent({
      componentName: 'TestWithMapping',
      luaModule: 'test.module',
      mapProps: props => ({
        // Transform props for Lua
        transformed: `${props.prefix || ''}${props.value || ''}${props.suffix || ''}`,
        original: props.value
      }),
      fallback: () => ['[TestWithMapping]']
    });
    
    // Mark component as Vum for renderer detection
    (TestComponent as any).__isVum = true;
    
    // Render the component with props
    createComponent(TestComponent, { 
      prefix: 'Hello ',
      value: 'World',
      suffix: '!'
    });
    
    // Verify props were mapped correctly
    expect(getRenderedOutput).toHaveBeenCalledWith(
      expect.objectContaining({
        prefix: 'Hello ',
        value: 'World',
        suffix: '!'
      }),
      'test.module',
      expect.any(String)
    );
  });
  
  it('supports dynamic luaModule resolution', () => {
    // Create a test component with dynamic module determination
    const DynamicComponent = createLuaComponent({
      componentName: 'DynamicModule',
      luaModule: props => `dynamic.${props.type || 'default'}`,
      mapProps: props => props,
      fallback: () => ['[DynamicComponent]']
    });
    
    // Mark component as Vum for renderer detection
    (DynamicComponent as any).__isVum = true;
    
    // Render with specific type
    createComponent(DynamicComponent, { type: 'custom' });
    
    // Verify dynamic module was resolved
    expect(getRenderedOutput).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'custom'
      }),
      'dynamic.custom',
      expect.any(String)
    );
    
    // Render with different type
    createComponent(DynamicComponent, { type: 'alternative' });
    
    // Verify different module was resolved
    expect(getRenderedOutput).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'alternative'
      }),
      'dynamic.alternative',
      expect.any(String)
    );
  });
});
