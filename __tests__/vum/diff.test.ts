/**
 * @jest-environment jsdom
 */

import { applyDiff } from '../../template/renderer';

// Mock buffer router for testing
const mockBufferRouter = {
  updateBufferContent: jest.fn().mockResolvedValue(true)
};

// Setup and teardown
beforeEach(() => {
  jest.clearAllMocks();
  
  // Set the mock buffer router
  require('../../template/renderer').setBufferRouter(mockBufferRouter);
});

describe('Advanced Diffing', () => {
  test('applyDiff generates minimal diff operations', () => {
    // Setup initial buffer content
    const oldLines = ['line1', 'line2', 'line3', 'line4'];
    
    // First update - initializes the buffer cache
    applyDiff(1, oldLines);
    // This first call will update the buffer content since it's the initial setup
    expect(mockBufferRouter.updateBufferContent).toHaveBeenCalledTimes(1);
    mockBufferRouter.updateBufferContent.mockClear();
    
    // Second update with changes
    const newLines = ['line1', 'updated', 'line3', 'newline', 'line4'];
    applyDiff(1, newLines);
    
    // Validate the diff operations
    expect(mockBufferRouter.updateBufferContent).toHaveBeenCalledTimes(1);
    expect(mockBufferRouter.updateBufferContent).toHaveBeenCalledWith(
      1, 
      [undefined, 'updated', undefined, 'newline', 'line4']
    );
  });
  
  test('applyDiff handles line deletions with null markers', () => {
    // Setup initial buffer content
    const oldLines = ['line1', 'line2', 'line3', 'line4', 'line5'];
    applyDiff(1, oldLines);
    mockBufferRouter.updateBufferContent.mockClear();
    
    // Update with deletions
    const newLines = ['line1', 'line4', 'line5'];
    applyDiff(1, newLines);
    
    // Validate the diff operations
    expect(mockBufferRouter.updateBufferContent).toHaveBeenCalledTimes(1);
    // Check if it was called with the right buffer ID
    expect(mockBufferRouter.updateBufferContent.mock.calls[0][0]).toBe(1);
    
    // Get the actual diff array that was passed
    const actualDiff = mockBufferRouter.updateBufferContent.mock.calls[0][1];
    
    // Validate that it contains the expected elements (order may vary based on implementation)
    expect(actualDiff).toContain(undefined);  // At least one unchanged line
    expect(actualDiff.filter(x => x === null).length).toBe(2);  // Two deleted lines
    expect(actualDiff).toContain('line4');    // Line 4 preserved
    expect(actualDiff).toContain('line5');    // Line 5 preserved
  });
  
  test('applyDiff handles additions correctly', () => {
    // Setup initial buffer content
    const oldLines = ['line1', 'line2'];
    applyDiff(1, oldLines);
    mockBufferRouter.updateBufferContent.mockClear();
    
    // Update with additions
    const newLines = ['line1', 'line2', 'line3', 'line4'];
    applyDiff(1, newLines);
    
    // Validate the diff operations
    expect(mockBufferRouter.updateBufferContent).toHaveBeenCalledTimes(1);
    expect(mockBufferRouter.updateBufferContent).toHaveBeenCalledWith(
      1, 
      [undefined, undefined, 'line3', 'line4']
    );
  });
  
  test('applyDiff handles replacements correctly', () => {
    // Setup initial buffer content
    const oldLines = ['line1', 'line2', 'line3'];
    applyDiff(1, oldLines);
    mockBufferRouter.updateBufferContent.mockClear();
    
    // Update with replacements
    const newLines = ['updated1', 'line2', 'updated3'];
    applyDiff(1, newLines);
    
    // Validate the diff operations
    expect(mockBufferRouter.updateBufferContent).toHaveBeenCalledTimes(1);
    expect(mockBufferRouter.updateBufferContent).toHaveBeenCalledWith(
      1, 
      ['updated1', undefined, 'updated3']
    );
  });
  
  test('applyDiff handles complete buffer replacement', () => {
    // Setup initial buffer content
    const oldLines = ['old1', 'old2', 'old3'];
    applyDiff(1, oldLines);
    mockBufferRouter.updateBufferContent.mockClear();
    
    // Update with completely different content
    const newLines = ['new1', 'new2', 'new3', 'new4'];
    applyDiff(1, newLines);
    
    // Validate the diff operations
    expect(mockBufferRouter.updateBufferContent).toHaveBeenCalledTimes(1);
    expect(mockBufferRouter.updateBufferContent).toHaveBeenCalledWith(
      1, 
      ['new1', 'new2', 'new3', 'new4']
    );
  });
});
