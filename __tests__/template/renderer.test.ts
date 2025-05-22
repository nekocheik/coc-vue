/**
 * Tests for the renderer module
 * 
 * This module tests the functionality that renders VNodes to buffer content
 */

import { renderVNode, applyDiff, setBufferRouter, TextVNode, ElementVNode, VNode } from '../../template/renderer';
// We only need the BufferRouter type for typing purposes
import type { BufferRouter } from '../../src/bufferRouter';

// Create a mock instance of BufferRouter
const mockBufferRouter = {
  updateBufferContent: jest.fn()
};

// Set up the mock buffer router for the tests
setBufferRouter(mockBufferRouter);

describe('Renderer', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
    mockBufferRouter.updateBufferContent.mockClear();
  });

  describe('renderVNode', () => {
    it('should render a simple text node', () => {
      const vnode: TextVNode = { type: 'TEXT_NODE', content: 'Hello World' };
      const lines = renderVNode(vnode);
      expect(lines).toEqual(['Hello World']);
    });

    it('should render an element with props and children', () => {
      const vnode: ElementVNode = {
        type: 'Text',
        props: { bold: true },
        children: [
          { type: 'TEXT_NODE', content: 'Hello' } as TextVNode
        ]
      };
      const lines = renderVNode(vnode);
      // Bold text in vim is surrounded by **
      expect(lines).toEqual(['**Hello**']);
    });

    it('should handle multiple children and nested elements', () => {
      const vnode: ElementVNode = {
        type: 'Container',
        props: {},
        children: [
          { type: 'TEXT_NODE', content: 'Line 1' } as TextVNode,
          { 
            type: 'Text', 
            props: { bold: true },
            children: [{ type: 'TEXT_NODE', content: 'Line 2' } as TextVNode]
          } as ElementVNode,
          { type: 'TEXT_NODE', content: 'Line 3' } as TextVNode
        ]
      };
      const lines = renderVNode(vnode);
      expect(lines).toEqual(['Line 1', '**Line 2**', 'Line 3']);
    });
  });

  describe('applyDiff', () => {
    it('should call updateBufferContent with buffer ID and lines', () => {
      const bufferId = 123;
      const lines = ['Line 1', 'Line 2', 'Line 3'];
      
      applyDiff(bufferId, lines);
      
      expect(mockBufferRouter.updateBufferContent).toHaveBeenCalledWith(bufferId, lines);
    });

    it('should compute minimal diff before updating buffer', () => {
      // Setup: define existing buffer content
      const existingLines = ['Old Line 1', 'Same Line 2', 'Old Line 3'];
      mockBufferRouter.updateBufferContent.mockImplementationOnce((_, lines) => {
        // Store the current lines as "existing" for the next call
        return existingLines;
      });
      
      // First call establishes the initial state
      applyDiff(123, existingLines);
      
      // Now apply a diff where only lines 1 and 3 change
      const newLines = ['New Line 1', 'Same Line 2', 'New Line 3'];
      applyDiff(123, newLines);
      
      // Should only send the changed lines in the diff
      expect(mockBufferRouter.updateBufferContent).toHaveBeenLastCalledWith(123, [
        'New Line 1',
        undefined, // undefined means "keep the existing line"
        'New Line 3'
      ]);
    });
  });
});
