/**
 * Select Component - Provides a dropdown/selection interface
 * 
 * This component bridges between TypeScript and Lua rendering
 */
import { createLuaComponent } from '../factory';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps {
  options: SelectOption[];
  value: string;
  title?: string;
  width?: number;
  /** Emits when user picks a new value */
  onChange?: (value: string) => void;
  /** Emits when any action is performed */
  onAction?: (action: { type: string, id?: string, value?: string }) => void;
}

/**
 * Get the index of an option in the options array by value
 */
function getSelectedIndex(value: string, options: SelectOption[]): number {
  return options.findIndex(opt => opt.value === value);
}

export default createLuaComponent<SelectProps, any>({
  componentName: 'Select',
  luaModule: 'vue-ui.components.select',
  
  mapProps: props => ({
    value: props.value,
    options: props.options.map(opt => ({ 
      value: opt.value, 
      text: opt.label,
      disabled: opt.disabled || false 
    })),
    title: props.title || '',
    width: props.width || 20,
    _is_open: false, // Controlled by Lua side
    focused_option_index: getSelectedIndex(props.value, props.options)
  }),
  
  events: {
    'select_change': (instance, value: string) => {
      const { props } = instance;
      if (value !== props.value) {
        // Call onChange handler if provided
        props.onChange?.(value);
        
        // Emit generic action event
        props.onAction?.({
          type: 'change',
          value: value,
          id: instance.id
        });
      }
    },
    'select_toggle': (instance, isOpen: boolean) => {
      // Emit action event for open/close
      instance.props.onAction?.({
        type: isOpen ? 'open' : 'close',
        id: instance.id
      });
    }
  },
  
  fallback: props => {
    const { options, value, title, width: propWidth } = props;
    const width = propWidth || 20;
    const lines: string[] = [];
    
    // Title if provided
    if (title) {
      lines.push(title);
    }
    
    // Render the current selection
    const selected = options.find(opt => opt.value === value);
    lines.push(`Selected: ${selected ? selected.label : 'None'}`);
    
    // In fallback mode, we show a simple list of options
    options.forEach((option) => {
      const indicator = option.value === value ? '● ' : '○ ';
      const label = option.label.length > width - 4 
        ? option.label.substring(0, width - 7) + '...' 
        : option.label;
      const line = `${indicator}${label}`;
      lines.push(line);
    });
    
    return lines;
  }
});
