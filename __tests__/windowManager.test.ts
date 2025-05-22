import { BufferRouter, BufferRoute } from '../src/bufferRouter';
import { WindowManager, WindowSlot } from '../src/windowManager';
import { mockBufferRoute, MockBufferRouter } from '../helper-test/utils/window-manager-mocks';

describe('WindowManager', () => {
  let bufferRouter: MockBufferRouter;
  let windowManager: WindowManager;

  beforeEach(() => {
    bufferRouter = new MockBufferRouter();
    windowManager = new WindowManager(bufferRouter as unknown as BufferRouter);
  });

  afterEach(() => {
    windowManager.dispose();
    bufferRouter.dispose();
  });

  describe('mountBuffer', () => {
    it('should mount a buffer into a slot', async () => {
      // Set current buffer to buffer-1 before mounting
      bufferRouter.setCurrentBuffer('buffer-1');
      
      const result = await windowManager.mountBuffer('slot-left', 'buffer-1', 'vim-component');
      expect(result).toBe(true);

      const mount = windowManager.getSlot('slot-left');
      expect(mount).not.toBeNull();
      expect(mount?.bufferId).toBe('buffer-1');
      expect(mount?.component).toBe('vim-component');
      expect(mount?.route).toEqual(mockBufferRoute);
    });

    it('should fail when mounting with invalid parameters', async () => {
      const result = await windowManager.mountBuffer('slot-center-top', '', 'vim-component');
      expect(result).toBe(false);
      expect(windowManager.getSlot('slot-center-top')).toBeNull();
    });

    it('should mount with a specified size', async () => {
      await windowManager.mountBuffer('slot-right', 'buffer-2', 'vim-component', 30);
      const mount = windowManager.getSlot('slot-right');
      expect(mount?.size).toBe(30);
    });

    it('should handle mounting to a slot that already has a buffer', async () => {
      await windowManager.mountBuffer('slot-left', 'buffer-1', 'vim-component');
      const result = await windowManager.mountBuffer('slot-left', 'buffer-2', 'vim-component');
      expect(result).toBe(true);
      
      const mount = windowManager.getSlot('slot-left');
      expect(mount?.bufferId).toBe('buffer-2');
    });
  });

  describe('unmountBuffer', () => {
    it('should unmount a buffer from a slot', async () => {
      await windowManager.mountBuffer('slot-left', 'buffer-1', 'vim-component');
      const result = windowManager.unmountBuffer('slot-left');
      
      expect(result).toBe(true);
      expect(windowManager.getSlot('slot-left')).toBeNull();
    });

    it('should return false when unmounting from an empty slot', () => {
      const result = windowManager.unmountBuffer('slot-left');
      expect(result).toBe(false);
    });
  });

  describe('getSlot', () => {
    it('should return null for an empty slot', () => {
      expect(windowManager.getSlot('slot-left')).toBeNull();
    });

    it('should return mount information for a filled slot', async () => {
      await windowManager.mountBuffer('slot-center-bottom', 'buffer-1', 'vim-component');
      const mount = windowManager.getSlot('slot-center-bottom');
      
      expect(mount).not.toBeNull();
      expect(mount?.bufferId).toBe('buffer-1');
      expect(mount?.component).toBe('vim-component');
    });
  });

  describe('getRouteForComponent', () => {
    it('should return route for a mounted component', async () => {
      // Set current buffer first
      bufferRouter.setCurrentBuffer('buffer-1');
      
      await windowManager.mountBuffer('slot-left', 'buffer-1', 'vim-component');
      const route = windowManager.getRouteForComponent('vim-component');
      
      expect(route).not.toBeNull();
      expect(route).toEqual(mockBufferRoute);
    });

    it('should return null for a component that is not mounted', () => {
      const route = windowManager.getRouteForComponent('unknown-component');
      expect(route).toBeNull();
    });
  });

  describe('resizeSlot', () => {
    it('should resize a slot with a mounted buffer', async () => {
      await windowManager.mountBuffer('slot-left', 'buffer-1', 'vim-component');
      const result = windowManager.resizeSlot('slot-left', 25);
      
      expect(result).toBe(true);
      expect(windowManager.getSlot('slot-left')?.size).toBe(25);
    });

    it('should not resize a bar slot', async () => {
      await windowManager.mountBuffer('bar-top', 'buffer-1', 'vim-component');
      const result = windowManager.resizeSlot('bar-top', 25);
      
      expect(result).toBe(false);
    });

    it('should not resize an empty slot', () => {
      const result = windowManager.resizeSlot('slot-left', 25);
      expect(result).toBe(false);
    });
  });

  describe('hasMount', () => {
    it('should return true for a slot with a mounted buffer', async () => {
      await windowManager.mountBuffer('slot-left', 'buffer-1', 'vim-component');
      expect(windowManager.hasMount('slot-left')).toBe(true);
    });

    it('should return false for an empty slot', () => {
      expect(windowManager.hasMount('slot-right')).toBe(false);
    });
  });

  describe('Reactivity', () => {
    it('should update mount information when slot is changed', async () => {
      // Mount a buffer
      await windowManager.mountBuffer('slot-left', 'buffer-1', 'vim-component');
      
      // Get a reference to the reactive slots object
      const reactiveSlots = windowManager.getReactiveSlots();
      
      // Change a property and verify it updates
      await windowManager.mountBuffer('slot-left', 'buffer-2', 'other-component');
      
      expect(reactiveSlots['slot-left']?.bufferId).toBe('buffer-2');
      expect(reactiveSlots['slot-left']?.component).toBe('other-component');
    });

    it('should react to buffer deletion', async () => {
      // Mount a buffer
      await windowManager.mountBuffer('slot-left', 'buffer-1', 'vim-component');
      
      // Delete the buffer
      bufferRouter.deleteBuffer('buffer-1');
      
      // Slot should be unmounted
      expect(windowManager.hasMount('slot-left')).toBe(false);
    });

    it('should update route when buffer changes', async () => {
      // Set initial buffer
      bufferRouter.setCurrentBuffer('buffer-1');
      
      // Mount a buffer
      await windowManager.mountBuffer('slot-left', 'buffer-1', 'vim-component');
      
      // Add a new buffer
      const newRoute: BufferRoute = {
        id: 'buffer-3',
        path: '/path/to/new.vue',
        query: { mode: 'edit' },
        createdAt: Date.now()
      };
      bufferRouter.addBuffer(newRoute);
      
      // Change current buffer first
      bufferRouter.setCurrentBuffer('buffer-3');
      
      // Mount the new buffer
      await windowManager.mountBuffer('slot-center-top', 'buffer-3', 'vim-component');
      
      // The route should be updated
      const mount = windowManager.getSlot('slot-center-top');
      expect(mount?.route).toEqual(newRoute);
    });
  });
});
