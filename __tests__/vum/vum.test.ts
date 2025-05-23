/**
 * @jest-environment jsdom
 */

import { VumComponent, VumRegistry, vumRegistry, requestRerender, emitter } from '../../template/vum/Vum';

// Create a concrete implementation of the abstract VumComponent for testing
class TestVumComponent extends VumComponent<{ name: string }, { count: number }> {
  public initState(props: { name: string }) {
    return { count: 0 };
  }
  
  public render() {
    return {
      lines: [`Component: ${this.props.name}, Count: ${this.state.count}`],
      highlights: []
    };
  }

  // Expose protected methods for testing
  public testOnMount() {
    this.onMount();
  }

  public testOnUpdate() {
    this.onUpdate();
  }

  public testOnUnmount() {
    this.onUnmount();
  }
  
  // Override the methods to make them testable
  public onMount(): void {}
  public onUpdate(): void {}
  public onUnmount(): void {}
}

describe('Vum Component System', () => {
  beforeEach(() => {
    // Clear registry between tests
    vumRegistry.clear();
    jest.clearAllMocks();
  });

  describe('VumComponent class', () => {
    test('should initialize with props and default state', () => {
      const component = new TestVumComponent({ name: 'test' });
      
      expect(component.props).toEqual({ name: 'test' });
      expect(component.state).toEqual({ count: 0 });
      expect(component._isMounted).toBe(true);
      expect(component.__isVum).toBe(true);
      expect(component.id).toBeDefined();
    });

    test('should initialize with custom ID and luaModule', () => {
      const component = new TestVumComponent({ name: 'test' }, 'custom-id', 'my-lua-module');
      
      expect(component.id).toBe('custom-id');
      expect(component.luaModule).toBe('my-lua-module');
    });

    test('should register itself with the vumRegistry upon creation', () => {
      const registerSpy = jest.spyOn(vumRegistry, 'register');
      const component = new TestVumComponent({ name: 'test' });
      
      expect(registerSpy).toHaveBeenCalledWith(component);
    });

    test('should update state and trigger rerender', () => {
      const rerenderSpy = jest.spyOn(emitter, 'emit');
      // Directly spy on the onUpdate method before creating the component
      const updateSpy = jest.spyOn(TestVumComponent.prototype, 'onUpdate');
      const component = new TestVumComponent({ name: 'test' });
      
      // Clear the calls from initialization
      updateSpy.mockClear();
      rerenderSpy.mockClear();
      
      component.setState(state => {
        state.count = 5;
      });
      
      expect(component.state.count).toBe(5);
      expect(updateSpy).toHaveBeenCalled();
      expect(rerenderSpy).toHaveBeenCalledWith('rerender');
    });

    test('should properly dispose itself', () => {
      const unregisterSpy = jest.spyOn(vumRegistry, 'unregister');
      // Directly spy on the onUnmount method before creating the component
      const unmountSpy = jest.spyOn(TestVumComponent.prototype, 'onUnmount');
      const component = new TestVumComponent({ name: 'test' });
      
      // Clear any calls from initialization
      unmountSpy.mockClear();
      
      component.dispose();
      
      expect(unmountSpy).toHaveBeenCalled();
      expect(component._isMounted).toBe(false);
      expect(unregisterSpy).toHaveBeenCalledWith(component.id);
    });

    test('dispose should not call onUnmount if already unmounted', () => {
      // Directly spy on the onUnmount method before creating the component
      const unmountSpy = jest.spyOn(TestVumComponent.prototype, 'onUnmount');
      const component = new TestVumComponent({ name: 'test' });
      
      // Clear any calls from initialization
      unmountSpy.mockClear();
      
      // First dispose
      component.dispose();
      expect(unmountSpy).toHaveBeenCalledTimes(1);
      
      // Reset the spy
      unmountSpy.mockClear();
      
      // Second dispose should not call onUnmount again
      component.dispose();
      expect(unmountSpy).not.toHaveBeenCalled();
    });

    test('render method should return expected output', () => {
      const component = new TestVumComponent({ name: 'testComponent' });
      
      const output = component.render();
      
      expect(output.lines).toEqual(['Component: testComponent, Count: 0']);
      expect(output.highlights).toEqual([]);
    });

    test('lifecycle hooks should be called at appropriate times', () => {
      // onMount is called in the constructor
      const mountSpy = jest.spyOn(TestVumComponent.prototype, 'onMount');
      const updateSpy = jest.spyOn(TestVumComponent.prototype, 'onUpdate');
      const unmountSpy = jest.spyOn(TestVumComponent.prototype, 'onUnmount');
      
      const component = new TestVumComponent({ name: 'test' });
      
      expect(mountSpy).toHaveBeenCalledTimes(1);
      
      component.setState(state => { state.count = 1; });
      expect(updateSpy).toHaveBeenCalledTimes(1);
      
      component.dispose();
      expect(unmountSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('VumRegistry class', () => {
    test('getInstance should return singleton instance', () => {
      const instance1 = VumRegistry.getInstance();
      const instance2 = VumRegistry.getInstance();
      
      expect(instance1).toBe(instance2);
      expect(instance1).toBe(vumRegistry);
    });

    test('should register and retrieve components', () => {
      const component = new TestVumComponent({ name: 'test' });
      
      expect(vumRegistry.get(component.id)).toBe(component);
    });

    test('should unregister components', () => {
      const component = new TestVumComponent({ name: 'test' });
      const id = component.id;
      
      vumRegistry.unregister(id);
      
      expect(vumRegistry.get(id)).toBeUndefined();
    });

    test('should get all registered components', () => {
      const component1 = new TestVumComponent({ name: 'test1' });
      const component2 = new TestVumComponent({ name: 'test2' });
      
      const allComponents = vumRegistry.getAll();
      
      expect(allComponents).toContain(component1);
      expect(allComponents).toContain(component2);
      expect(allComponents.length).toBe(2);
    });

    test('should clear all components', () => {
      const component1 = new TestVumComponent({ name: 'test1' });
      const component2 = new TestVumComponent({ name: 'test2' });
      const disposeSpy1 = jest.spyOn(component1, 'dispose');
      const disposeSpy2 = jest.spyOn(component2, 'dispose');
      
      vumRegistry.clear();
      
      expect(disposeSpy1).toHaveBeenCalled();
      expect(disposeSpy2).toHaveBeenCalled();
      expect(vumRegistry.getAll().length).toBe(0);
    });

    test('updateAll should trigger rerender', () => {
      const rerenderSpy = jest.spyOn(emitter, 'emit');
      
      vumRegistry.updateAll();
      
      expect(rerenderSpy).toHaveBeenCalledWith('rerender');
    });
  });

  describe('requestRerender function', () => {
    test('should emit rerender event', () => {
      const emitSpy = jest.spyOn(emitter, 'emit');
      
      requestRerender();
      
      expect(emitSpy).toHaveBeenCalledWith('rerender');
    });
  });
});
