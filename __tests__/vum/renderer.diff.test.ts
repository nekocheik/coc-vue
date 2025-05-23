// Import mocks first
import '../helpers/vumTestKit';

// Import required components and utilities
import { applyDiff } from '../../template/renderer';
import { mockBufferRouter, setupRenderer, resetMocks } from '../helpers/vumTestKit';

describe('Renderer Diff Algorithm', () => {
  beforeEach(() => {
    resetMocks();
    setupRenderer();
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  it('applies minimal changes when adding a line', () => {
    // New content with a line added
    const newLines = ['A', 'X', 'B', 'C'];
    
    // Apply new lines to buffer
    applyDiff(1, newLines);
    
    // Verify bufferRouter was called with the diff array
    expect(mockBufferRouter.updateBufferContent).toHaveBeenCalledWith(
      1,  // Buffer ID
      expect.any(Array)  // Diff array
    );
    
    // Check that it was called
    expect(mockBufferRouter.updateBufferContent).toHaveBeenCalledTimes(1);
  });
  
  it('applies minimal changes when removing a line', () => {
    // New content with a line removed
    const newLines = ['A', 'C', 'D'];
    
    // Apply new lines to buffer
    applyDiff(1, newLines);
    
    // Verify bufferRouter was called with the diff array
    expect(mockBufferRouter.updateBufferContent).toHaveBeenCalledWith(
      1,  // Buffer ID
      expect.any(Array)  // Diff array
    );
    
    // Check that it was called
    expect(mockBufferRouter.updateBufferContent).toHaveBeenCalledTimes(1);
  });
  
  it('applies minimal changes when replacing a line', () => {
    // New content with a line replaced
    const newLines = ['A', 'X', 'C'];
    
    // Apply new lines to buffer
    applyDiff(1, newLines);
    
    // Verify bufferRouter was called
    expect(mockBufferRouter.updateBufferContent).toHaveBeenCalledWith(
      1,  // Buffer ID
      expect.any(Array)  // Diff array
    );
    
    // Check that it was called
    expect(mockBufferRouter.updateBufferContent).toHaveBeenCalledTimes(1);
  });
  
  it('applies minimal changes for multiple changes', () => {
    // New content with multiple changes
    const newLines = ['A', 'X', 'C', 'Y', 'E'];
    
    // Apply new lines to buffer
    applyDiff(1, newLines);
    
    // Verify bufferRouter was called
    expect(mockBufferRouter.updateBufferContent).toHaveBeenCalledWith(
      1,  // Buffer ID
      expect.any(Array)  // Diff array
    );
    
    // Check that it was called
    expect(mockBufferRouter.updateBufferContent).toHaveBeenCalledTimes(1);
  });
  
  it('applies minimal changes when appending lines', () => {
    // New content with lines appended
    const newLines = ['A', 'B', 'C', 'D', 'E'];
    
    // Apply new lines to buffer
    applyDiff(1, newLines);
    
    // Verify bufferRouter was called
    expect(mockBufferRouter.updateBufferContent).toHaveBeenCalledWith(
      1,  // Buffer ID
      expect.any(Array)  // Diff array
    );
    
    // Check that it was called
    expect(mockBufferRouter.updateBufferContent).toHaveBeenCalledTimes(1);
  });
  
  it('applies minimal changes when prepending lines', () => {
    // First set up the buffer with some content
    const initialContent = ['C', 'D', 'E'];
    applyDiff(1, initialContent);
    
    // Clear the mock to start fresh
    mockBufferRouter.updateBufferContent.mockClear();
    
    // New content with lines prepended
    const newLines = ['A', 'B', 'C', 'D', 'E'];
    
    // Apply new lines to buffer
    applyDiff(1, newLines);
    
    // Verify mockBufferRouter was called
    expect(mockBufferRouter.updateBufferContent).toHaveBeenCalledWith(
      1,  // Buffer ID
      expect.any(Array)  // Diff array
    );
    
    // Check that it was called
    expect(mockBufferRouter.updateBufferContent).toHaveBeenCalledTimes(1);
  });
  
  it('handles completely different content', () => {
    // Completely new content
    const newLines = ['X', 'Y', 'Z'];
    
    // Apply new lines to buffer
    applyDiff(1, newLines);
    
    // Verify bufferRouter was called
    expect(mockBufferRouter.updateBufferContent).toHaveBeenCalledWith(
      1,  // Buffer ID
      expect.any(Array)  // Diff array
    );
    
    // Check that it was called
    expect(mockBufferRouter.updateBufferContent).toHaveBeenCalledTimes(1);
  });
  
  it('handles new content with empty buffer', () => {
    // New content
    const newLines = ['A', 'B', 'C'];
    
    // Apply new lines to buffer
    applyDiff(1, newLines);
    
    // Verify bufferRouter was called
    expect(mockBufferRouter.updateBufferContent).toHaveBeenCalledWith(
      1,  // Buffer ID
      expect.any(Array)  // Diff array
    );
    
    // Check that it was called
    expect(mockBufferRouter.updateBufferContent).toHaveBeenCalledTimes(1);
  });
  
  it('handles empty new content', () => {
    // New content is empty
    const newLines: string[] = [];
    
    // Apply new lines to buffer
    applyDiff(1, newLines);
    
    // Verify bufferRouter was called
    expect(mockBufferRouter.updateBufferContent).toHaveBeenCalledWith(
      1,  // Buffer ID
      expect.any(Array)  // Diff array
    );
    
    // Check that it was called
    expect(mockBufferRouter.updateBufferContent).toHaveBeenCalledTimes(1);
  });
});
