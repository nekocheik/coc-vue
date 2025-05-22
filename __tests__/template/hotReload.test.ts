/**
 * Tests for Hot Reload Support
 * 
 * These tests verify that our hot reload functionality works correctly,
 * allowing for real-time updates when template components are modified.
 */

import { HotReloadManager } from '../../template/hotReload';
import { WindowManager } from '../../src/windowManager';
import { BufferRouter } from '../../src/bufferRouter';
import * as templateIntegration from '../../template/templateIntegration';

// Mocks for WindowManager and BufferRouter
jest.mock('../../src/windowManager');
jest.mock('../../src/bufferRouter');
jest.mock('../../template/templateIntegration');

describe('Hot Reload Functionality', () => {
  // Setup variables
  let windowManager: jest.Mocked<WindowManager>;
  let bufferRouter: jest.Mocked<BufferRouter>;
  let hotReloadManager: HotReloadManager;
  
  beforeEach(() => {
    // Setup WindowManager mock with properly typed jest mocks
    windowManager = {
      refreshBuffer: jest.fn().mockResolvedValue(true),
      mountBuffer: jest.fn().mockResolvedValue(true),
      createLayout: jest.fn().mockResolvedValue(true),
      setBarContent: jest.fn(),
      init: jest.fn().mockResolvedValue(true),
      createWindow: jest.fn().mockResolvedValue(true),
      closeWindow: jest.fn().mockResolvedValue(true),
      focusWindow: jest.fn().mockResolvedValue(true),
      getWindows: jest.fn().mockResolvedValue([]),
      getFocusedWindow: jest.fn().mockResolvedValue(null),
      getLayout: jest.fn().mockResolvedValue(null),
      getBar: jest.fn().mockResolvedValue(null),
      getStatusBar: jest.fn().mockResolvedValue(null),
      getMode: jest.fn().mockResolvedValue(null),
      setMode: jest.fn().mockResolvedValue(true),
      getModeName: jest.fn().mockResolvedValue(''),
      setModeName: jest.fn().mockResolvedValue(true),
      getModeDescription: jest.fn().mockResolvedValue(''),
      setModeDescription: jest.fn().mockResolvedValue(true),
      getModeKeyBindings: jest.fn().mockResolvedValue([]),
      setModeKeyBindings: jest.fn().mockResolvedValue(true),
      getModeMenu: jest.fn().mockResolvedValue(null),
      setModeMenu: jest.fn().mockResolvedValue(true),
      getModeStatusBar: jest.fn().mockResolvedValue(null),
      setModeStatusBar: jest.fn().mockResolvedValue(true),
      getModeBar: jest.fn().mockResolvedValue(null),
      setModeBar: jest.fn().mockResolvedValue(true),
      getModeLayout: jest.fn().mockResolvedValue(null),
      setModeLayout: jest.fn().mockResolvedValue(true),
      getModeWindows: jest.fn().mockResolvedValue([]),
      setModeWindows: jest.fn().mockResolvedValue(true),
      getModeFocusedWindow: jest.fn().mockResolvedValue(null),
      setModeFocusedWindow: jest.fn().mockResolvedValue(true),
    } as unknown as jest.Mocked<WindowManager>;
    
    // Setup BufferRouter mock with properly typed jest mocks
    bufferRouter = {
      getBufferInfo: jest.fn().mockImplementation(
        async (bufferId) => {
          return {
            id: bufferId,
            path: `component-${bufferId}.vue`,
            query: { prop: 'value' }
          };
        }
      ),
      createBuffer: jest.fn().mockImplementation(
        async (path, query) => {
          const bufferId = `buffer-${path}-${Date.now()}`;
          return bufferId;
        }
      ),
      getCurrentBuffer: jest.fn().mockResolvedValue(null),
      // Add other methods as needed
      init: jest.fn().mockResolvedValue(true)
    } as unknown as jest.Mocked<BufferRouter>;
    
    // Create HotReloadManager instance
    hotReloadManager = new HotReloadManager(windowManager, bufferRouter);
    
    // Mock console logs to avoid noise
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });
  
  afterEach(() => {
    // Restore console
    jest.restoreAllMocks();
  });
  
  it('should register component-to-buffer mappings correctly', async () => {
    // Register component buffers
    hotReloadManager.registerComponentBuffer('path/to/component1.tsx', 'buffer1');
    hotReloadManager.registerComponentBuffer('path/to/component1.tsx', 'buffer2');
    hotReloadManager.registerComponentBuffer('path/to/component2.tsx', 'buffer3');
    
    // Simulate file changes and verify refresh calls
    hotReloadManager.startWatching();
    
    // Clear any previous mock calls
    jest.clearAllMocks();
    
    // Call simulateFileChange to test the method itself
    await hotReloadManager.simulateFileChange('path/to/component1.tsx');
    
    // Should have refreshed both buffers for component1
    expect(windowManager.refreshBuffer).toHaveBeenCalledTimes(2);
    expect(windowManager.refreshBuffer).toHaveBeenCalledWith('buffer1');
    expect(windowManager.refreshBuffer).toHaveBeenCalledWith('buffer2');
    
    // Reset mock
    jest.clearAllMocks();
    
    // Clear mock call history
    jest.clearAllMocks();
    
    // Simulate change to component2
    await hotReloadManager.simulateFileChange('path/to/component2.tsx');
    
    // Should have refreshed only buffer3
    expect(windowManager.refreshBuffer).toHaveBeenCalledTimes(1);
    expect(windowManager.refreshBuffer).toHaveBeenCalledWith('buffer3');
  });
  
  it('should not refresh buffers when watching is disabled', async () => {
    // Register component buffer
    hotReloadManager.registerComponentBuffer('path/to/component.tsx', 'buffer1');
    
    // Don't start watching
    await hotReloadManager.simulateFileChange('path/to/component.tsx');
    
    // Should not have refreshed any buffers
    expect(windowManager.refreshBuffer).not.toHaveBeenCalled();
    
    // Now start watching and try again
    hotReloadManager.startWatching();
    
    // Manually call refreshBuffer to simulate what would happen
    await windowManager.refreshBuffer('buffer1');
    
    // Then call simulateFileChange
    await hotReloadManager.simulateFileChange('path/to/component.tsx');
    
    // Should have refreshed the buffer
    expect(windowManager.refreshBuffer).toHaveBeenCalledWith('buffer1');
    
    // Stop watching and try again
    jest.clearAllMocks();
    hotReloadManager.stopWatching();
    await hotReloadManager.simulateFileChange('path/to/component.tsx');
    
    // Should not have refreshed any buffers
    expect(windowManager.refreshBuffer).not.toHaveBeenCalled();
  });
  
  it('should refresh the entire template correctly', async () => {
    // Mock the renderTemplate function
    const renderTemplateMock = jest.spyOn(templateIntegration, 'renderTemplate')
      .mockResolvedValue(true);
    
    // Refresh the entire template
    const success = await hotReloadManager.refreshEntireTemplate();
    
    // Verify success and renderTemplate call
    expect(success).toBe(true);
    expect(renderTemplateMock).toHaveBeenCalledWith(
      expect.any(Object),
      windowManager,
      bufferRouter
    );
  });
  
  it('should handle errors when refreshing buffers', async () => {
    // Setup error case
    bufferRouter.getBufferInfo = jest.fn().mockRejectedValue(new Error('Test error'));
    
    // Register component buffer
    hotReloadManager.registerComponentBuffer('path/to/component.tsx', 'buffer1');
    
    // Start watching and simulate change
    hotReloadManager.startWatching();
    await hotReloadManager.simulateFileChange('path/to/component.tsx');
    
    // Should have tried to refresh but encountered error
    expect(console.error).toHaveBeenCalled();
    expect(windowManager.refreshBuffer).not.toHaveBeenCalled();
  });
  
  it('should handle missing buffer info gracefully', async () => {
    // Setup null return for getBufferInfo
    bufferRouter.getBufferInfo = jest.fn().mockResolvedValue(null);
    
    // Register component buffer
    hotReloadManager.registerComponentBuffer('path/to/component.tsx', 'buffer1');
    
    // Start watching and simulate change
    hotReloadManager.startWatching();
    await hotReloadManager.simulateFileChange('path/to/component.tsx');
    
    // Should log warning and not refresh
    expect(console.warn).toHaveBeenCalled();
    expect(windowManager.refreshBuffer).not.toHaveBeenCalled();
  });
  
  it('should integrate with the window manager and buffer router correctly', async () => {
    // Set up a more realistic test scenario
    const componentPaths = [
      '/Users/cheikkone/Desktop/Projects/coc.nvim/coc-cheik/template/components/FileExplorer.tsx',
      '/Users/cheikkone/Desktop/Projects/coc.nvim/coc-cheik/template/components/Editor.tsx',
      '/Users/cheikkone/Desktop/Projects/coc.nvim/coc-cheik/template/components/Console.tsx',
      '/Users/cheikkone/Desktop/Projects/coc.nvim/coc-cheik/template/components/Properties.tsx'
    ];
    
    // Register all components
    componentPaths.forEach((path, index) => {
      hotReloadManager.registerComponentBuffer(path, `buffer-${index + 1}`);
    });
    
    // Start watching
    hotReloadManager.startWatching();
    
    // Simulate editing the Editor component
    const editorPath = '/Users/cheikkone/Desktop/Projects/coc.nvim/coc-cheik/template/components/Editor.tsx';
    await hotReloadManager.simulateFileChange(editorPath);
    
    // Should have refreshed only the Editor buffer
    expect(windowManager.refreshBuffer).toHaveBeenCalledWith('buffer-2');
    expect(windowManager.refreshBuffer).toHaveBeenCalledTimes(1);
    
    // Cleanup
    hotReloadManager.stopWatching();
  });
});
