import { EventEmitter } from 'events';
import { BufferRouter, BufferRoute } from '../../src/bufferRouter';

/**
 * Mock buffer route for testing
 */
export const mockBufferRoute: BufferRoute = {
  id: 'buffer-1',
  path: '/path/to/component.vue',
  query: { view: 'template' },
  createdAt: Date.now()
};

/**
 * Mock buffer router for testing the WindowManager
 */
export class MockBufferRouter {
  private buffers: Record<string, BufferRoute> = {};
  private currentBuffer: string | null = null;
  private emitter = new EventEmitter();

  constructor() {
    this.emitter.setMaxListeners(20); // Prevent EventEmitter warnings
    // Add some test buffers
    this.buffers['buffer-1'] = { ...mockBufferRoute };
    this.buffers['buffer-2'] = {
      id: 'buffer-2',
      path: '/path/to/another.vue',
      query: {},
      createdAt: Date.now()
    };
  }

  async getBufferById(id: string): Promise<BufferRoute | null> {
    return this.buffers[id] || null;
  }

  async getCurrentBuffer(): Promise<BufferRoute | null> {
    return this.currentBuffer ? this.buffers[this.currentBuffer] : null;
  }
  
  // For testing only - direct access to buffers
  getBufferSync(id: string): BufferRoute | null {
    return this.buffers[id] || null;
  }

  setCurrentBuffer(id: string): void {
    const oldBuffer = this.currentBuffer ? this.buffers[this.currentBuffer] : null;
    this.currentBuffer = id;
    const newBuffer = this.buffers[id] || null;
    this.emitter.emit(BufferRouter.Events.CURRENT_BUFFER_CHANGED, { oldBuffer, newBuffer });
  }

  deleteBuffer(id: string): void {
    if (this.buffers[id]) {
      delete this.buffers[id];
      this.emitter.emit(BufferRouter.Events.BUFFER_DELETED, { id });
    }
  }

  addBuffer(route: BufferRoute): void {
    this.buffers[route.id] = route;
    this.emitter.emit(BufferRouter.Events.BUFFER_CREATED, { id: route.id, path: route.path, query: route.query });
  }

  on(event: string, listener: (...args: any[]) => void): { dispose: () => void } {
    this.emitter.on(event, listener);
    return { dispose: () => { this.emitter.off(event, listener); } };
  }

  dispose(): void {
    this.emitter.removeAllListeners();
  }
}
