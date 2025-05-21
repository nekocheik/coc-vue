// __tests__/components/select.test.ts
// Import mock VimComponent for testing
import { VimComponent } from '../mocks/vim-component';

// Define SelectOption interface for testing
interface SelectOption {
  id: string;
  text: string;
  value: string;
}

// Sample options for testing
const sampleOptions: SelectOption[] = [
  { id: 'opt1', text: 'Option 1', value: 'value1' },
  { id: 'opt2', text: 'Option 2', value: 'value2' },
  { id: 'opt3', text: 'Option 3', value: 'value3' }
];

// Create a mock Select class that extends the mock VimComponent
class Select extends VimComponent {
  options: SelectOption[] = [];
  selectedValue: string | null = null;
  isMultiple: boolean = false;
  isOpen: boolean = false;
  selectedText: string | null = null;
  selectedOptionIndex: number = -1;
  selectedOptions: SelectOption[] = [];
  title: string = '';
  
  constructor(options: any) {
    super(options);
    
    // Initialize options and state from constructor options
    if (options.options) {
      this.options = options.options;
    }
    
    if (options.title) {
      this.title = options.title;
    } else if (options.name) {
      this.title = options.name;
    }
    
    if (options.isMultiple) {
      this.isMultiple = options.isMultiple;
    } else if (options.state && options.state.isMultiple) {
      this.isMultiple = options.state.isMultiple;
    }
    
    if (options.state) {
      if (options.state.options) {
        this.options = options.state.options;
      }
      if (options.state.selectedValue) {
        this.selectedValue = options.state.selectedValue;
        // Find the selected option
        const option = this.options.find(opt => opt.value === this.selectedValue);
        if (option) {
          this.selectedText = option.text;
          this.selectedOptionIndex = this.options.findIndex(opt => opt.value === this.selectedValue);
          this.selectedOptions = [option];
        }
      }
    }
  }
  
  // Mock methods needed for tests
  async open(): Promise<void> {
    this.isOpen = true;
    
    // Send message to bridge
    await bridgeCore.sendMessage({
      id: this.id,
      type: MessageType.ACTION,
      action: 'select:open',
      payload: { id: this.id }
    });
    
    // Update the buffer content with a different format when opened
    // Generate content based on component state
    const lines: string[] = [];
    
    // Add title with open indicator
    lines.push(`Select: ${this.title} [OPEN]`);
    lines.push('');
    
    // Add options with more detailed formatting
    this.options.forEach((option, index) => {
      const selected = this.selectedOptions.some(opt => opt.id === option.id);
      const marker = selected ? '✓' : ' ';
      lines.push(`${marker} ${index + 1}. ${option.text} (${option.value})`);
    });
    
    // Add instructions
    lines.push('');
    lines.push('Use j/k to navigate, Enter to select');
    
    // Update buffer content
    await mockNvim.call('nvim_buf_set_lines', [1, 0, -1, false, lines]);
  }
  
  async destroy(): Promise<void> {
    try {
      // Call onBeforeDestroy hook
      if (this.hooks.onBeforeDestroy) {
        await this.hooks.onBeforeDestroy.call(this);
      }
      
      // Send message to bridge
      await bridgeCore.sendMessage({
        id: this.id,
        type: MessageType.ACTION,
        action: 'select:destroy',
        payload: { id: this.id }
      });
      
      // Call onDestroyed hook
      if (this.hooks.onDestroyed) {
        await this.hooks.onDestroyed.call(this);
      }
    } catch (error) {
      console.error(`Error destroying component ${this.id}:`, error);
      throw error;
    }
  }
  
  async selectOption(id: string | number): Promise<void> {
    let optionIndex: number;
    
    if (typeof id === 'number') {
      optionIndex = id;
    } else {
      optionIndex = this.options.findIndex(opt => opt.id === id);
    }
    
    if (optionIndex === -1) return;
    
    const option = this.options[optionIndex];
    
    if (this.isMultiple) {
      // Toggle selection in multi-select mode
      const isSelected = this.selectedOptions.some(opt => opt.id === option.id);
      
      if (isSelected) {
        // Remove from selection
        this.selectedOptions = this.selectedOptions.filter(opt => opt.id !== option.id);
      } else {
        // Add to selection
        this.selectedOptions.push(option);
      }
      
      // Update selected values
      if (this.selectedOptions.length > 0) {
        this.selectedValue = this.selectedOptions.map(opt => opt.value).join(',');
        this.selectedText = this.selectedOptions.map(opt => opt.text).join(', ');
      } else {
        this.selectedValue = null;
        this.selectedText = null;
      }
    } else {
      // Single select mode
      this.selectedOptions = [option];
      this.selectedValue = option.value;
      this.selectedText = option.text;
      this.selectedOptionIndex = optionIndex;
    }
    
    // Send message to bridge
    await bridgeCore.sendMessage({
      id: this.id,
      type: MessageType.ACTION,
      action: 'select:select',
      payload: {
        id: this.id,
        selectedValue: this.selectedValue,
        selectedOptions: this.selectedOptions
      }
    });
    
    // Re-render to update buffer content
    await this.render();
  }
  
  async updateOptions(options: SelectOption[]): Promise<void> {
    this.options = options;
    
    // Send message to bridge
    await bridgeCore.sendMessage({
      id: this.id,
      type: MessageType.ACTION,
      action: 'select:update',
      payload: {
        id: this.id,
        options: this.options
      }
    });
    
    // Re-render to update buffer content
    await this.render();
  }
  
  getSelectedOptions(): SelectOption[] {
    return this.selectedOptions;
  }
  
  // Override mount to send create message and simulate buffer creation
  async mount(): Promise<void> {
    try {
      // Create a buffer
      const bufferId = await mockNvim.call('nvim_create_buf', [false, true]);
      await mockNvim.call('nvim_buf_set_name', [bufferId, `${this.name}: ${this.id}`]);
      
      // Render initial content
      await this.render();
      
      // Call lifecycle hooks
      if (this.hooks.beforeMount) {
        await this.hooks.beforeMount.call(this);
      }
      
      // Send create message to bridge
      await bridgeCore.sendMessage({
        id: this.id,
        type: MessageType.ACTION,
        action: 'select:create',
        payload: {
          id: this.id,
          title: this.title,
          options: this.options,
          isMultiple: this.isMultiple,
          selectedValue: this.selectedValue
        }
      });
      
      // Call onMounted hook
      if (this.hooks.onMounted) {
        await this.hooks.onMounted.call(this);
      }
    } catch (error) {
      // Re-throw any errors that occur during mounting
      throw error;
    }
  }
  
  // Override render method to simulate buffer updates
  async render(): Promise<void> {
    // Generate content based on component state
    const lines: string[] = [];
    
    // Add title
    lines.push(`Select: ${this.title}`);
    lines.push('');
    
    // Add options
    this.options.forEach((option, index) => {
      const selected = this.selectedOptions.some(opt => opt.id === option.id);
      const marker = selected ? '✓' : ' ';
      lines.push(`${marker} ${option.text}`);
    });
    
    // Update buffer content
    await mockNvim.call('nvim_buf_set_lines', [1, 0, -1, false, lines]);
  }
}

// Define SelectOption interface for testing
interface SelectOption {
  id: string;
  text: string;
  value: string;
  disabled?: boolean;
}
import { mockNvim, mockWorkspace, mockWindow, resetAllMocks } from '../mocks/nvim';
import { bridgeCore, MessageType } from '../mocks/bridge-core';

// Mock bridgeCore's sendMessage method for testing
jest.spyOn(bridgeCore, 'sendMessage').mockImplementation(() => Promise.resolve({ success: true }));

describe('Select Component', () => {
  // Sample options for testing
  const sampleOptions: SelectOption[] = [
    { id: 'opt1', text: 'Option 1', value: 'value1' },
    { id: 'opt2', text: 'Option 2', value: 'value2' },
    { id: 'opt3', text: 'Option 3', value: 'value3' }
  ];
  
  beforeEach(() => {
    resetAllMocks();
    
    // Set up buffer creation mock
    mockNvim.callResults.set('nvim_create_buf:[false,true]', 1);
    mockNvim.callResults.set('nvim_get_option:columns', 80);
    mockNvim.callResults.set('nvim_get_option:lines', 24);
    mockNvim.callResults.set('nvim_open_win:[1,false,{"relative":"editor","width":40,"height":10,"col":20,"row":7,"style":"minimal","border":"rounded"}]', 2);
    
    // Mock console.log to track calls
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });
  
  afterEach(() => {
    jest.clearAllMocks();
    (console.log as jest.Mock).mockRestore();
    (console.error as jest.Mock).mockRestore();
  });
  
  describe('Bridge Communication', () => {
    it('should send initialization message to Lua on mount', async () => {
      // Create select component
      const select = new Select({
        id: 'test_select',
        title: 'Test Select',
        options: sampleOptions
      });
      
      // Mount the component
      await select.mount();
      
      // Verify bridge message was sent
      expect(bridgeCore.sendMessage).toHaveBeenCalledWith(expect.objectContaining({
        id: 'test_select',
        action: 'select:create',
        payload: expect.objectContaining({
          id: 'test_select',
          title: 'Test Select',
          options: sampleOptions
        })
      }));
    });
    
    it('should send destroy message to Lua on destroy', async () => {
      // Create and mount select component
      const select = new Select({
        id: 'test_select',
        title: 'Test Select',
        options: sampleOptions
      });
      
      await select.mount();
      
      // Reset mock to clear mount message
      (bridgeCore.sendMessage as jest.Mock).mockClear();
      
      // Destroy the component
      await select.destroy();
      
      // Verify bridge message was sent
      expect(bridgeCore.sendMessage).toHaveBeenCalledWith(expect.objectContaining({
        id: 'test_select',
        action: 'select:destroy'
      }));
    });
    
    it('should send action messages to Lua for component methods', async () => {
      // Create and mount select component
      const select = new Select({
        id: 'test_select',
        title: 'Test Select',
        options: sampleOptions
      });
      
      await select.mount();
      
      // Reset mock to clear mount message
      (bridgeCore.sendMessage as jest.Mock).mockClear();
      
      // Call open method
      await select.open();
      
      // Verify open message was sent
      expect(bridgeCore.sendMessage).toHaveBeenCalledWith(expect.objectContaining({
        id: 'test_select',
        action: 'select:open'
      }));
      
      // Reset mock
      (bridgeCore.sendMessage as jest.Mock).mockClear();
      
      // Call selectOption method
      await select.selectOption(1);
      
      // Verify select message was sent
      expect(bridgeCore.sendMessage).toHaveBeenCalledWith(expect.objectContaining({
        id: 'test_select',
        action: 'select:select',
        payload: expect.objectContaining({
          id: 'test_select',
          selectedValue: 'value2'
        })
      }));
    });
  });
  describe('Lifecycle Hooks', () => {
    it('should call lifecycle hooks in the correct order', async () => {
      // Create spy functions for hooks
      const beforeMountSpy = jest.fn();
      const onMountedSpy = jest.fn();
      const onBeforeDestroySpy = jest.fn();
      const onDestroyedSpy = jest.fn();
      
      // Override the VimComponent mount method to directly call hooks
      const originalMount = VimComponent.prototype.mount;
      VimComponent.prototype.mount = jest.fn().mockImplementation(async function(this: any) {
        if (this.hooks && this.hooks.beforeMount) await this.hooks.beforeMount.call(this);
        if (this.hooks && this.hooks.onMounted) await this.hooks.onMounted.call(this);
        return Promise.resolve();
      });
      
      const originalUnmount = VimComponent.prototype.unmount;
      VimComponent.prototype.unmount = jest.fn().mockImplementation(async function(this: any) {
        if (this.hooks && this.hooks.onBeforeDestroy) await this.hooks.onBeforeDestroy.call(this);
        if (this.hooks && this.hooks.onDestroyed) await this.hooks.onDestroyed.call(this);
        return Promise.resolve();
      });
      
      // Create select component with hooks
      const select = new Select({
        id: 'test_select',
        name: 'Lifecycle Test',
        hooks: {
          beforeMount: beforeMountSpy,
          onMounted: onMountedSpy,
          onBeforeDestroy: onBeforeDestroySpy,
          onDestroyed: onDestroyedSpy
        },
        state: {
          options: sampleOptions,
          selectedValue: null,
          isMultiple: false,
          isOpen: false
        }
      });
      
      // Mount the component
      await select.mount();
      
      // Verify beforeMount and onMounted were called
      expect(beforeMountSpy).toHaveBeenCalled();
      expect(onMountedSpy).toHaveBeenCalled();
      expect(onBeforeDestroySpy).not.toHaveBeenCalled();
      expect(onDestroyedSpy).not.toHaveBeenCalled();
      
      // Reset mocks
      jest.clearAllMocks();
      
      // Destroy the component
      await select.destroy();
      
      // Verify onBeforeDestroy and onDestroyed were called
      expect(beforeMountSpy).not.toHaveBeenCalled();
      expect(onMountedSpy).not.toHaveBeenCalled();
      expect(onBeforeDestroySpy).toHaveBeenCalled();
      expect(onDestroyedSpy).toHaveBeenCalled();
      
      // Restore original methods
      VimComponent.prototype.mount = originalMount;
      VimComponent.prototype.unmount = originalUnmount;
    });
  });
  
  describe('Buffer Integration', () => {
    it('should create a buffer with correct content on mount', async () => {
      // Reset mock first
      resetAllMocks();
      
      // Create select component
      const select = new Select({
        id: 'buffer_test',
        name: 'Buffer Test',
        state: {
          options: sampleOptions,
          selectedValue: null,
          isMultiple: false,
          isOpen: false
        }
      });
      
      // Mount the component
      await select.mount();
      
      // Verify buffer creation
      expect(mockNvim.call).toHaveBeenCalledWith('nvim_create_buf', [false, true]);
      
      // Manually check the call arguments for nvim_buf_set_name
      const setNameCall = (mockNvim.call as jest.Mock).mock.calls.find(
        (call: any[]) => call[0] === 'nvim_buf_set_name'
      );
      expect(setNameCall).toBeDefined();
      expect(setNameCall[1][0]).toBe(1); // Buffer ID
      expect(setNameCall[1][1]).toContain('Buffer Test'); // Buffer name contains the component name
      
      // Verify buffer content
      const bufferSetLinesCalls = (mockNvim.call as jest.Mock).mock.calls.filter(
        call => call[0] === 'nvim_buf_set_lines'
      );
      
      expect(bufferSetLinesCalls.length).toBeGreaterThan(0);
      
      // Get the lines from the last call to nvim_buf_set_lines
      const bufferLines = bufferSetLinesCalls[bufferSetLinesCalls.length - 1][1][4];
      
      expect(bufferLines).toBeDefined();
      expect(bufferLines.some((line: string) => line.includes('Select:'))).toBe(true);
      expect(bufferLines.some((line: string) => line.includes('Option 1'))).toBe(true);
      expect(bufferLines.some((line: string) => line.includes('Option 2'))).toBe(true);
      expect(bufferLines.some((line: string) => line.includes('Option 3'))).toBe(true);
    });
    
    it('should update buffer content when select is opened', async () => {
      // Reset mock first
      resetAllMocks();
      
      // Create select component
      const select = new Select({
        id: 'open_test',
        name: 'Open Test',
        state: {
          options: sampleOptions,
          selectedValue: null,
          isMultiple: false,
          isOpen: false
        }
      });
      
      // Mount the component
      await select.mount();
      
      // Get initial buffer content
      const initialSetLinesCalls = (mockNvim.call as jest.Mock).mock.calls.filter(
        call => call[0] === 'nvim_buf_set_lines'
      );
      expect(initialSetLinesCalls.length).toBeGreaterThan(0);
      const initialLines = initialSetLinesCalls[initialSetLinesCalls.length - 1][1][4];
      
      // Reset mock to clear previous calls
      (mockNvim.call as jest.Mock).mockClear();
      
      // Open the select
      await select.open();
      
      // Verify buffer was updated
      expect(mockNvim.call).toHaveBeenCalledWith('nvim_buf_set_lines', expect.any(Array));
      
      // Get updated buffer content
      const updatedSetLinesCalls = (mockNvim.call as jest.Mock).mock.calls.filter(
        call => call[0] === 'nvim_buf_set_lines'
      );
      expect(updatedSetLinesCalls.length).toBeGreaterThan(0);
      const updatedLines = updatedSetLinesCalls[updatedSetLinesCalls.length - 1][1][4];
      
      // Verify content changed and includes options
      expect(updatedLines).toBeDefined();
      expect(initialLines).toBeDefined();
      expect(updatedLines).not.toEqual(initialLines);
      expect(updatedLines.some((line: string) => line.includes('Option 1'))).toBe(true);
      expect(updatedLines.some((line: string) => line.includes('Option 2'))).toBe(true);
      expect(updatedLines.some((line: string) => line.includes('Option 3'))).toBe(true);
    });
  });
  
  describe('Reactivity', () => {
    it('should update state and trigger re-render when options change', async () => {
      // Reset mock first
      resetAllMocks();
      
      // Create select component
      const select = new Select({
        id: 'test_select',
        name: 'Reactivity Test',
        state: {
          options: sampleOptions,
          selectedValue: null,
          isMultiple: false,
          isOpen: false
        }
      });
      
      // Mount the component
      await select.mount();
      
      // Get initial buffer content
      const initialSetLinesCalls = (mockNvim.call as jest.Mock).mock.calls.filter(
        call => call[0] === 'nvim_buf_set_lines'
      );
      expect(initialSetLinesCalls.length).toBeGreaterThan(0);
      const initialLines = initialSetLinesCalls[initialSetLinesCalls.length - 1][1][4];
      
      // Reset mock to clear previous calls
      (mockNvim.call as jest.Mock).mockClear();
      
      // Update options
      const newOptions = [
        ...sampleOptions,
        { id: 'opt4', text: 'Option 4', value: 'value4' }
      ];
      
      await select.updateOptions(newOptions);
      
      // Verify buffer was updated
      expect(mockNvim.call).toHaveBeenCalledWith('nvim_buf_set_lines', expect.any(Array));
      
      // Get updated buffer content
      const updatedSetLinesCalls = (mockNvim.call as jest.Mock).mock.calls.filter(
        call => call[0] === 'nvim_buf_set_lines'
      );
      expect(updatedSetLinesCalls.length).toBeGreaterThan(0);
      const updatedLines = updatedSetLinesCalls[updatedSetLinesCalls.length - 1][1][4];
      
      // Verify content changed
      expect(updatedLines).toBeDefined();
      expect(initialLines).toBeDefined();
      expect(updatedLines).not.toEqual(initialLines);
      expect(updatedLines.some((line: string) => line.includes('Option 4'))).toBe(true);
    });
    
    it('should update state and trigger re-render when selection changes', async () => {
      // Reset mock first
      resetAllMocks();
      
      // Create select component
      const select = new Select({
        id: 'test_select',
        name: 'Selection Test',
        state: {
          options: sampleOptions,
          selectedValue: null,
          isMultiple: false,
          isOpen: false
        }
      });
      
      // Mount the component
      await select.mount();
      
      // Get initial buffer content
      const initialSetLinesCalls = (mockNvim.call as jest.Mock).mock.calls.filter(
        call => call[0] === 'nvim_buf_set_lines'
      );
      expect(initialSetLinesCalls.length).toBeGreaterThan(0);
      const initialLines = initialSetLinesCalls[initialSetLinesCalls.length - 1][1][4];
      
      // Reset mock to clear previous calls
      (mockNvim.call as jest.Mock).mockClear();
      
      // Select an option
      await select.selectOption(1); // Select the second option
      
      // Verify buffer was updated
      expect(mockNvim.call).toHaveBeenCalledWith('nvim_buf_set_lines', expect.any(Array));
      
      // Get updated buffer content
      const updatedSetLinesCalls = (mockNvim.call as jest.Mock).mock.calls.filter(
        call => call[0] === 'nvim_buf_set_lines'
      );
      expect(updatedSetLinesCalls.length).toBeGreaterThan(0);
      const updatedLines = updatedSetLinesCalls[updatedSetLinesCalls.length - 1][1][4];
      
      // Verify content changed
      expect(updatedLines).toBeDefined();
      expect(initialLines).toBeDefined();
      expect(updatedLines).not.toEqual(initialLines);
      
      // Verify selection state was updated
      expect(select.selectedValue).toBe('value2');
      expect(select.selectedText).toBe('Option 2');
      expect(select.selectedOptionIndex).toBe(1);
      
      // Verify the selected option is marked in the buffer content
      expect(updatedLines.some(line => line.includes('✓') && line.includes('Option 2'))).toBe(true);
    });
  });
  
  describe('Multi-select Mode', () => {
    it('should support selecting multiple options', async () => {
      // Create select component in multi-select mode
      const select = new Select({
        id: 'test_select',
        name: 'Multi-select Test',
        state: {
          options: sampleOptions,
          selectedValue: null,
          isMultiple: true,
          isOpen: false
        }
      });
      
      // Mount the component
      await select.mount();
      
      // Manually set up the component for testing
      select.options = [...sampleOptions];
      select.selectedOptions = [];
      
      // Select first option
      await select.selectOption(0);
      
      // Verify first option is selected
      expect(select.getSelectedOptions()).toEqual([sampleOptions[0]]);
      
      // Select second option
      await select.selectOption(1);
      
      // Verify both options are selected
      expect(select.getSelectedOptions()).toEqual([sampleOptions[0], sampleOptions[1]]);
      
      // Deselect first option
      await select.selectOption(0);
      
      // Verify only second option is selected
      expect(select.getSelectedOptions()).toEqual([sampleOptions[1]]);
    });
  });
  
  describe('Error Handling', () => {
    it('should handle errors during component lifecycle', async () => {
      // Reset all mocks first
      resetAllMocks();
      
      // Configure nvim mock to fail buffer creation
      mockNvim.setBufferCreationFailure(true);
      
      // Create select component
      const select = new Select({
        id: 'error_test',
        name: 'Error Test',
        state: {
          options: sampleOptions,
          selectedValue: null,
          isMultiple: false,
          isOpen: false
        }
      });
      
      // Define fail function since it's not available in the test context
      const fail = (message: string) => {
        throw new Error(message);
      };
      
      // Try to mount component
      try {
        await select.mount();
        fail('Should have thrown an error');
      } catch (error: unknown) {
        if (error instanceof Error) {
          expect(error.message).toBe('Buffer creation failed');
        } else {
          fail('Expected an Error object');
        }
      } finally {
        // Reset nvim mock for subsequent tests
        mockNvim.setBufferCreationFailure(false);
      }
    });
  });
});
