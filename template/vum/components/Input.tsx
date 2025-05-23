/**
 * Input Component - Text input field with optional label
 * 
 * This component bridges between TypeScript and Lua rendering
 */
import { createLuaComponent } from '../factory';

export interface InputProps {
  value: string;
  label?: string;
  placeholder?: string;
  width?: number;
  disabled?: boolean;
  password?: boolean;
  /** Emits when user changes the value */
  onChange?: (value: string) => void;
  /** Emits when any action is performed */
  onAction?: (action: { type: string, id?: string, value?: string }) => void;
}

export default createLuaComponent<InputProps, any>({
  componentName: 'Input',
  luaModule: 'vue-ui.components.input',
  
  mapProps: props => ({
    value: props.value,
    label: props.label || '',
    placeholder: props.placeholder || '',
    width: props.width || 20,
    disabled: props.disabled || false,
    password: props.password || false,
    focused: false // managed by Lua side
  }),
  
  events: {
    'input_change': (instance, value: string) => {
      const { props } = instance;
      
      // Call onChange handler if provided
      props.onChange?.(value);
      
      // Emit generic action event
      props.onAction?.({
        type: 'change',
        value: value,
        id: instance.id
      });
    },
    'input_focus': (instance, isFocused: boolean) => {
      // Emit action event for focus change
      instance.props.onAction?.({
        type: isFocused ? 'focus' : 'blur',
        id: instance.id
      });
    },
    'input_keypress': (instance, key: string) => {
      // Emit action event for key press
      instance.props.onAction?.({
        type: 'keypress',
        value: key,
        id: instance.id
      });
    }
  },
  
  fallback: props => {
    const { value, label, placeholder, width: propWidth, disabled, password } = props;
    const width = propWidth || 20;
    const lines: string[] = [];
    
    // Add label if provided
    if (label) {
      lines.push(label);
    }
    
    // Create input display
    const displayValue = value || placeholder || '';
    const maskedValue = password ? displayValue.replace(/./g, '*') : displayValue;
    const paddedValue = maskedValue.padEnd(width - 4, ' ').substring(0, width - 4);
    let inputDisplay = `[ ${paddedValue} ]`;
    
    // Add disabled indicator if needed
    if (disabled) {
      inputDisplay = `(${inputDisplay})`;
    }
    
    lines.push(inputDisplay);
    return lines;
  }
});
