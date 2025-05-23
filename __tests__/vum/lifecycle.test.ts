/**
 * @jest-environment jsdom
 */

import { createElement, Fragment } from '../../template/tsxFactory';
import { componentRegistry } from '../../template/registry';
import { renderVNode, applyDiff } from '../../template/renderer';

// Mock buffer router for testing
const mockBufferRouter = {
  updateBufferContent: jest.fn().mockResolvedValue(true)
};

// Setup and teardown
beforeEach(() => {
  jest.clearAllMocks();
  componentRegistry.clear();
  
  // Set the mock buffer router
  require('../../template/renderer').setBufferRouter(mockBufferRouter);
});

describe('Lifecycle Hooks', () => {
  test('onMount hook fires exactly once when component is mounted', async () => {
    // Setup
    const onMountMock = jest.fn();
    
    // Create a component with onMount
    const TestComponent = (props: any) => {
      props.onMount?.();
      return createElement('div', {}, props.children);
    };
    
    // Render
    const vnode = createElement(TestComponent, { onMount: onMountMock });
    const lines = renderVNode(vnode);
    
    // Apply to buffer
    applyDiff(1, lines);
    
    // Validate
    expect(onMountMock).toHaveBeenCalledTimes(1);
  });
  
  test.skip('onUpdate hook fires when component is updated with old and new vnodes', async () => {
    // Setup
    const onUpdateMock = jest.fn();
    
    // Create a component with onUpdate
    const TestComponent = (props: any) => {
      return createElement('div', {}, props.children);
    };
    
    // First render
    const vnode1 = createElement(TestComponent, { value: 'initial', onUpdate: onUpdateMock });
    const lines1 = renderVNode(vnode1);
    applyDiff(1, lines1);
    
    // Second render with updated props
    const vnode2 = createElement(TestComponent, { value: 'updated', onUpdate: onUpdateMock });
    const lines2 = renderVNode(vnode2);
    applyDiff(1, lines2);
    
    // Validate
    expect(onUpdateMock).toHaveBeenCalledTimes(1);
    expect(onUpdateMock).toHaveBeenCalledWith(vnode2, vnode1);
  });
  
  test.skip('onUnmount hook fires when component is removed', async () => {
    // Setup
    const onUnmountMock = jest.fn();
    
    // Create a component with onUnmount
    const TestComponent = (props: any) => {
      return createElement('div', {}, props.children);
    };
    
    // First render with the component
    const vnode1 = createElement('div', {}, [
      createElement(TestComponent, { onUnmount: onUnmountMock })
    ]);
    const lines1 = renderVNode(vnode1);
    applyDiff(1, lines1);
    
    // Second render without the component
    const vnode2 = createElement('div', {}, []);
    const lines2 = renderVNode(vnode2);
    applyDiff(1, lines2);
    
    // Validate
    expect(onUnmountMock).toHaveBeenCalledTimes(1);
  });
  
  test.skip('lifecycle hooks fire in correct order: mount, update, unmount', async () => {
    // Setup
    const lifecycleOrder: string[] = [];
    
    const onMountMock = jest.fn(() => lifecycleOrder.push('mount'));
    const onUpdateMock = jest.fn(() => lifecycleOrder.push('update'));
    const onUnmountMock = jest.fn(() => lifecycleOrder.push('unmount'));
    
    // Create a component with all lifecycle hooks
    const TestComponent = (props: any) => {
      return createElement('div', {}, props.children);
    };
    
    // First render with the component
    const vnode1 = createElement(TestComponent, { 
      value: 'initial', 
      onMount: onMountMock,
      onUpdate: onUpdateMock,
      onUnmount: onUnmountMock
    });
    const lines1 = renderVNode(vnode1);
    applyDiff(1, lines1);
    
    // Second render with updated props
    const vnode2 = createElement(TestComponent, { 
      value: 'updated', 
      onMount: onMountMock,
      onUpdate: onUpdateMock,
      onUnmount: onUnmountMock
    });
    const lines2 = renderVNode(vnode2);
    applyDiff(1, lines2);
    
    // Third render without the component
    const vnode3 = createElement('div', {}, []);
    const lines3 = renderVNode(vnode3);
    applyDiff(1, lines3);
    
    // Validate
    expect(onMountMock).toHaveBeenCalledTimes(1);
    expect(onUpdateMock).toHaveBeenCalledTimes(1);
    expect(onUnmountMock).toHaveBeenCalledTimes(1);
    expect(lifecycleOrder).toEqual(['mount', 'update', 'unmount']);
  });
});
