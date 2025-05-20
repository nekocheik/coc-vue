// src/components/select.ts
import { workspace, window } from 'coc.nvim';
import { VimComponent, ComponentOptions, BufferOptions } from './vim-component';
import { bridgeCore, BridgeMessage, MessageType } from '../bridge/core';

/**
 * SelectOption interface
 */
export interface SelectOption {
  id: string;
  text: string;
  value: string;
  disabled?: boolean;
}

/**
 * SelectConfig interface
 */
export interface SelectConfig {
  id: string;
  title: string;
  width?: number;
  style?: string;
  options?: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  multi?: boolean;
  maxVisibleOptions?: number;
  initialValue?: string;
  bufferOptions?: BufferOptions;
}

/**
 * Select component class
 * Implements a bridge to the Lua Select component
 */
export class Select extends VimComponent {
  // Public properties that match the Lua component
  private _options: SelectOption[] = [];
  private _selectedOptionIndex: number | null = null;
  private _selectedValue: string | null = null;
  private _selectedText: string | null = null;
  private _selectedOptions: SelectOption[] = [];
  private _isOpen: boolean = false;
  private _focusedOptionIndex: number = -1;
  
  /**
   * Constructor
   * @param config Select configuration
   */
  constructor(config: SelectConfig) {
    // Default buffer options for Select component
    const defaultBufferOptions: BufferOptions = {
      name: `Select: ${config.title}`,
      filetype: 'vue-select',
      buflisted: false,
      modifiable: false,
      readonly: true,
      scratch: true,
      width: config.width || 30,
      height: 10, // Will be adjusted based on options
      position: 'floating',
      focusOnCreate: true
    };
    
    // Create component options
    const componentOptions: ComponentOptions = {
      id: config.id,
      type: 'select',
      props: {
        title: config.title,
        style: config.style || 'default',
        placeholder: config.placeholder || 'Select...',
        disabled: config.disabled || false,
        required: config.required || false,
        multi: config.multi || false,
        maxVisibleOptions: config.maxVisibleOptions || 5
      },
      state: {
        options: config.options || [],
        selectedOptionIndex: null,
        selectedValue: null,
        selectedText: null,
        selectedOptions: [],
        isOpen: false,
        focusedOptionIndex: -1
      },
      bufferOptions: { ...defaultBufferOptions, ...config.bufferOptions },
      
      // Lifecycle hooks
      beforeMount: async function(this: VimComponent) {
        console.log(`[Select] Mounting select component: ${this.id}`);
      },
      
      onMounted: async function(this: VimComponent) {
        console.log(`[Select] Select component mounted: ${this.id}`);
        
        // Initialize the component in Lua
        await bridgeCore.sendMessage({
          id: this.id,
          type: MessageType.ACTION,
          action: 'select:create',
          payload: {
            id: this.id,
            title: this.props.title,
            width: this.props.width || 30,
            style: this.props.style,
            options: this.state.options,
            placeholder: this.props.placeholder,
            disabled: this.props.disabled,
            required: this.props.required,
            multi: this.props.multi,
            maxVisibleOptions: this.props.maxVisibleOptions
          }
        });
        
        // If initialValue is provided, select it
        if (config.initialValue) {
          await (this as any).selectByValue(config.initialValue);
        }
      },
      
      onUpdated: async function(this: VimComponent) {
        console.log(`[Select] Select component updated: ${this.id}`);
      },
      
      onBeforeDestroy: async function(this: VimComponent) {
        console.log(`[Select] Select component will be destroyed: ${this.id}`);
      },
      
      onDestroyed: async function(this: VimComponent) {
        console.log(`[Select] Select component destroyed: ${this.id}`);
        
        // Destroy the component in Lua
        await bridgeCore.sendMessage({
          id: this.id,
          type: MessageType.ACTION,
          action: 'select:destroy',
          payload: {}
        });
      },
      
      // Methods
      methods: {
        // Open the select dropdown
        open: async function(this: VimComponent): Promise<boolean> {
          if (this.state.disabled || this.state.isOpen) {
            return false;
          }
          
          this.updateState({ isOpen: true });
          
          // Send open command to Lua
          const result = await bridgeCore.sendMessage({
            id: this.id,
            type: MessageType.ACTION,
            action: 'select:open',
            payload: {}
          });
          
          return true;
        },
        
        // Close the select dropdown
        close: async function(this: VimComponent): Promise<boolean> {
          if (!this.state.isOpen) {
            return false;
          }
          
          this.updateState({ isOpen: false });
          
          // Send close command to Lua
          const result = await bridgeCore.sendMessage({
            id: this.id,
            type: MessageType.ACTION,
            action: 'select:close',
            payload: {}
          });
          
          return true;
        },
        
        // Focus on a specific option
        focusOption: async function(this: VimComponent, index: number): Promise<boolean> {
          if (!this.state.isOpen || index < 0 || index >= this.state.options.length) {
            return false;
          }
          
          this.updateState({ focusedOptionIndex: index });
          
          // Send focus command to Lua
          const result = await bridgeCore.sendMessage({
            id: this.id,
            type: MessageType.ACTION,
            action: 'select:focusOption',
            payload: { index }
          });
          
          return true;
        },
        
        // Focus on the next option
        focusNextOption: async function(this: VimComponent): Promise<boolean> {
          if (!this.state.isOpen || this.state.options.length === 0) {
            return false;
          }
          
          // Calculate next index
          const nextIndex = this.state.focusedOptionIndex >= 0 ?
            (this.state.focusedOptionIndex + 1) % this.state.options.length : 0;
          
          return await this.callMethod('focusOption', nextIndex) as Promise<boolean>;
        },
        
        // Focus on the previous option
        focusPrevOption: async function(this: VimComponent): Promise<boolean> {
          if (!this.state.isOpen || this.state.options.length === 0) {
            return false;
          }
          
          // Calculate previous index
          const prevIndex = this.state.focusedOptionIndex >= 0 ?
            (this.state.focusedOptionIndex - 1 + this.state.options.length) % this.state.options.length : 
            this.state.options.length - 1;
          
          return await this.callMethod('focusOption', prevIndex) as Promise<boolean>;
        },
        
        // Select an option by index
        selectOption: async function(this: VimComponent, index: number): Promise<boolean> {
          if (index < 0 || index >= this.state.options.length) {
            return false;
          }
          
          const option = this.state.options[index] as SelectOption;
          
          if (this.props.multi) {
            // Multi-select mode: toggle selection
            const isSelected = this.state.selectedOptions.some((opt: SelectOption) => opt.id === option.id);
            
            if (isSelected) {
              // Remove from selection
              this.updateState({
                selectedOptions: this.state.selectedOptions.filter((opt: SelectOption) => opt.id !== option.id)
              });
            } else {
              // Add to selection
              this.updateState({
                selectedOptions: [...this.state.selectedOptions, option]
              });
            }
          } else {
            // Single-select mode: replace selection
            this.updateState({
              selectedOptionIndex: index,
              selectedValue: option.value,
              selectedText: option.text
            });
            
            // Close the select after selection in single-select mode
            if (typeof this.callMethod === 'function') {
              await this.callMethod('close');
            }
          }
          
          // Send select command to Lua
          const result = await bridgeCore.sendMessage({
            id: this.id,
            type: MessageType.ACTION,
            action: 'select:selectOption',
            payload: { index }
          });
          
          return true;
        },
        
        // Select the currently focused option
        selectCurrentOption: async function(this: VimComponent): Promise<boolean> {
          if (!this.state.isOpen || this.state.focusedOptionIndex < 0) {
            return false;
          }
          
          return await this.callMethod('selectOption', this.state.focusedOptionIndex) as Promise<boolean>;
        },
        
        // Select an option by value
        selectByValue: async function(this: VimComponent, value: string): Promise<boolean> {
          const index = this.state.options.findIndex((option: SelectOption) => option.value === value);
          
          if (index === -1) {
            return false;
          }
          
          // Send select by value command to Lua
          const result = await bridgeCore.sendMessage({
            id: this.id,
            type: MessageType.ACTION,
            action: 'select:selectByValue',
            payload: { value }
          });
          
          // Update local state
          const option = this.state.options[index] as SelectOption;
          
          if (this.props.multi) {
            // Multi-select mode: add to selection if not already selected
            if (!this.state.selectedOptions.some((opt: SelectOption) => opt.id === option.id)) {
              this.updateState({
                selectedOptions: [...this.state.selectedOptions, option]
              });
            }
          } else {
            // Single-select mode: replace selection
            this.updateState({
              selectedOptionIndex: index,
              selectedValue: option.value,
              selectedText: option.text
            });
          }
          
          return true;
        },
        
        // Confirm the current selection
        confirm: async function(this: VimComponent): Promise<boolean> {
          if (!this.state.isOpen) {
            return false;
          }
          
          // Send confirm command to Lua
          const result = await bridgeCore.sendMessage({
            id: this.id,
            type: MessageType.ACTION,
            action: 'select:confirm',
            payload: {}
          });
          
          // Close the select
          await this.callMethod('close');
          
          return true;
        },
        
        // Cancel the current selection
        cancel: async function(this: VimComponent, reason?: string): Promise<boolean> {
          if (!this.state.isOpen) {
            return false;
          }
          
          // Send cancel command to Lua
          const result = await bridgeCore.sendMessage({
            id: this.id,
            type: MessageType.ACTION,
            action: 'select:cancel',
            payload: { reason: reason || 'user_cancelled' }
          });
          
          // Close the select
          await this.callMethod('close');
          
          return true;
        },
        
        // Update the options
        updateOptions: async function(this: VimComponent, options: SelectOption[]): Promise<boolean> {
          this.updateState({ options });
          
          // Send update options command to Lua
          const result = await bridgeCore.sendMessage({
            id: this.id,
            type: MessageType.ACTION,
            action: 'select:updateOptions',
            payload: { options }
          });
          
          return true;
        },
        
        // Set disabled state
        setDisabled: async function(this: VimComponent, disabled: boolean): Promise<boolean> {
          this.updateState({ disabled });
          
          // Send set disabled command to Lua
          const result = await bridgeCore.sendMessage({
            id: this.id,
            type: MessageType.ACTION,
            action: 'select:setDisabled',
            payload: { disabled }
          });
          
          if (disabled && this.state.isOpen) {
            if (typeof this.callMethod === 'function') {
              await this.callMethod('close');
            }
          }
          
          return true;
        },
        
        // Get the selected value
        getValue: function(this: VimComponent): string | null {
          return this.state.selectedValue;
        },
        
        // Get the selected option
        getSelectedOption: function(this: VimComponent): SelectOption | null {
          if (this.state.selectedOptionIndex === null) {
            return null;
          }
          
          return this.state.options[this.state.selectedOptionIndex];
        },
        
        // Get the selected options (for multi-select)
        getSelectedOptions: function(this: VimComponent): SelectOption[] {
          return this.state.selectedOptions;
        },
        
        // Check if the select is open
        isOpen: function(this: VimComponent): boolean {
          return this.state.isOpen;
        }
      },
      
      // Computed properties
      computed: {
        displayValue: function(this: VimComponent): string {
          if (this.props.multi) {
            // Multi-select mode
            if (this.state.selectedOptions.length > 0) {
              return this.state.selectedOptions.map((opt: SelectOption) => opt.text).join(', ');
            }
          } else {
            // Single-select mode
            if (this.state.selectedText) {
              return this.state.selectedText;
            }
          }
          
          return this.props.placeholder || 'Select...';
        }
      },
      
      // Watchers
      watch: {
        'isOpen': function(this: VimComponent, newValue: boolean, oldValue: boolean) {
          console.log(`[Select] isOpen changed from ${oldValue} to ${newValue}`);
        },
        'selectedValue': function(this: VimComponent, newValue: string | null, oldValue: string | null) {
          console.log(`[Select] selectedValue changed from ${oldValue} to ${newValue}`);
          
          // Emit value change event
          bridgeCore.sendMessage({
            id: this.id,
            type: MessageType.EVENT,
            action: 'select:valueChanged',
            payload: {
              oldValue,
              newValue
            }
          });
        }
      },
      
      // Render function
      render: function(this: VimComponent, state: Record<string, any>): string[] {
        const lines: string[] = [];
        
        // Title
        lines.push(this.props.title);
        
        // Select line
        // Use a computed property directly from state to avoid async issues
        let displayText = this.props.placeholder || 'Select...';
        if (this.props.multi && state.selectedOptions.length > 0) {
          displayText = state.selectedOptions.map((opt: SelectOption) => opt.text).join(', ');
        } else if (state.selectedText) {
          displayText = state.selectedText;
        }
        
        const style = this.props.disabled ? 'disabled' : this.props.style;
        
        // Create select line
        const selectLine = `[ ${displayText} ]`;
        lines.push(selectLine);
        
        // If open, show options
        if (state.isOpen) {
          // Separator
          const bufferWidth = (this as any).bufferOptions?.width || 30;
          lines.push('-'.repeat(bufferWidth));
          
          // Options
          const visibleOptions = Math.min(state.options.length, this.props.maxVisibleOptions);
          
          for (let i = 0; i < visibleOptions; i++) {
            const option = state.options[i] as SelectOption;
            if (!option) break;
            
            let prefix = '  ';
            
            // Focus indicator
            if (i === state.focusedOptionIndex) {
              prefix = '> ';
            }
            
            // Selection indicator
            let suffix = '  ';
            if (this.props.multi) {
              // Multi-select mode
              if (state.selectedOptions.some((opt: SelectOption) => opt.id === option.id)) {
                suffix = '[x] ';
              } else {
                suffix = '[ ] ';
              }
            } else {
              // Single-select mode
              if (i === state.selectedOptionIndex) {
                suffix = '* ';
              }
            }
            
            lines.push(`${prefix}${option.text}${suffix}`);
          }
        }
        
        return lines;
      }
    };
    
    // Initialize the component
    super(componentOptions);
    
    // Register message handlers for select-specific events
    this.registerSelectMessageHandlers();
  }
  
  /**
   * Register message handlers for select-specific events
   */
  private registerSelectMessageHandlers(): void {
    // Register handler for select-specific messages
    bridgeCore.registerHandler(`select:${this.id}`, async (message: BridgeMessage) => {
      if (message.id !== this.id) return;
      
      if (message.type === MessageType.EVENT) {
        // Handle select events
        switch (message.action) {
          case 'select:opened':
            this.updateState({ isOpen: true });
            break;
            
          case 'select:closed':
            this.updateState({ isOpen: false });
            break;
            
          case 'select:optionSelected':
            if (message.payload?.index !== undefined) {
              const index = message.payload.index;
              const option = this.state.options[index] as SelectOption;
              
              if (this.props.multi) {
                // Multi-select mode: toggle selection
                const isSelected = this.state.selectedOptions.some((opt: SelectOption) => opt.id === option.id);
                
                if (isSelected) {
                  // Remove from selection
                  this.updateState({
                    selectedOptions: this.state.selectedOptions.filter((opt: SelectOption) => opt.id !== option.id)
                  });
                } else {
                  // Add to selection
                  this.updateState({
                    selectedOptions: [...this.state.selectedOptions, option]
                  });
                }
              } else {
                // Single-select mode: replace selection
                this.updateState({
                  selectedOptionIndex: index,
                  selectedValue: option.value,
                  selectedText: option.text
                });
              }
            }
            break;
            
          case 'select:optionFocused':
            if (message.payload?.index !== undefined) {
              this.updateState({ focusedOptionIndex: message.payload.index });
            }
            break;
            
          case 'select:confirmed':
            // Handle confirmation
            break;
            
          case 'select:cancelled':
            // Handle cancellation
            break;
        }
      }
    });
  }
  
  // Public API methods that match the Lua component
  
  /**
   * Open the select dropdown
   */
  async open(): Promise<boolean> {
    return await this.callMethod('open');
  }
  
  /**
   * Close the select dropdown
   */
  async close(): Promise<boolean> {
    return await this.callMethod('close');
  }
  
  /**
   * Focus on a specific option
   * @param index Option index
   */
  async focusOption(index: number): Promise<boolean> {
    return await this.callMethod('focusOption', index);
  }
  
  /**
   * Focus on the next option
   */
  async focusNextOption(): Promise<boolean> {
    return await this.callMethod('focusNextOption');
  }
  
  /**
   * Focus on the previous option
   */
  async focusPrevOption(): Promise<boolean> {
    return await this.callMethod('focusPrevOption');
  }
  
  /**
   * Select an option by index
   * @param index Option index
   */
  async selectOption(index: number): Promise<boolean> {
    return await this.callMethod('selectOption', index);
  }
  
  /**
   * Select the currently focused option
   */
  async selectCurrentOption(): Promise<boolean> {
    return await this.callMethod('selectCurrentOption');
  }
  
  /**
   * Select an option by value
   * @param value Option value
   */
  async selectByValue(value: string): Promise<boolean> {
    return await this.callMethod('selectByValue', value);
  }
  
  /**
   * Confirm the current selection
   */
  async confirm(): Promise<boolean> {
    return await this.callMethod('confirm');
  }
  
  /**
   * Cancel the current selection
   * @param reason Cancellation reason
   */
  async cancel(reason?: string): Promise<boolean> {
    return await this.callMethod('cancel', reason);
  }
  
  /**
   * Update the options
   * @param options New options
   */
  async updateOptions(options: SelectOption[]): Promise<boolean> {
    return await this.callMethod('updateOptions', options);
  }
  
  /**
   * Set disabled state
   * @param disabled Whether the select should be disabled
   */
  async setDisabled(disabled: boolean): Promise<boolean> {
    return await this.callMethod('setDisabled', disabled);
  }
  
  /**
   * Get the selected value
   */
  getValue(): string | null {
    // Access state directly instead of using callMethod to avoid async issues
    return this.state.selectedValue;
  }
  
  /**
   * Get the selected option
   */
  getSelectedOption(): SelectOption | null {
    // Access state directly instead of using callMethod to avoid async issues
    if (this.state.selectedOptionIndex === null) {
      return null;
    }
    return this.state.options[this.state.selectedOptionIndex] as SelectOption;
  }
  
  /**
   * Get the selected options (for multi-select)
   */
  getSelectedOptions(): SelectOption[] {
    // Access state directly instead of using callMethod to avoid async issues
    return this.state.selectedOptions as SelectOption[];
  }
  
  /**
   * Check if the select is open
   */
  isOpen(): boolean {
    // Access state directly instead of using callMethod to avoid async issues
    return this.state.isOpen as boolean;
  }
  
  /**
   * Get the options
   */
  get options(): SelectOption[] {
    return this.state.options;
  }
  
  /**
   * Get the selected value
   */
  get selectedValue(): string | null {
    return this.state.selectedValue;
  }
  
  /**
   * Get the selected text
   */
  get selectedText(): string | null {
    return this.state.selectedText;
  }
  
  /**
   * Get the selected option index
   */
  get selectedOptionIndex(): number | null {
    return this.state.selectedOptionIndex;
  }
}