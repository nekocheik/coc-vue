/**
 * Button Component - Interactive button with click handling
 */
import { createLuaComponent } from '../factory';

interface ButtonProps {
  children: string;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  width?: number;
  onClick?: () => void;
  onAction?: (action: { type: string, id?: string }) => void;
}

/**
 * Convert variant prop to Lua style name
 */
function variantToStyle(variant?: string): string {
  switch (variant) {
    case 'secondary': return 'default';
    case 'danger': return 'error';
    default: return 'primary';
  }
}

export default createLuaComponent<ButtonProps, any>({
  componentName: 'Button',
  luaModule: 'vue-ui.components.button',

  mapProps: props => ({
    text: props.children,
    config: {
      style: variantToStyle(props.variant),
      width: props.width || 20,
      enabled: !props.disabled,
      border: true
    },
    is_focused: false, // state managed by Lua side
    is_disabled: props.disabled || false
  }),

  events: {
    'button_click': (instance, _) => {
      const { onClick, onAction, disabled } = instance.props;
      if (disabled) return;
      
      if (onClick) onClick();
      onAction?.({ type: 'click', id: instance.id });
    },
    'button_hover': (instance, isHovered) => {
      const { onAction } = instance.props;
      onAction?.({ 
        type: isHovered ? 'hover' : 'unhover', 
        id: instance.id 
      });
    },
    'button_press': (instance, isPressed) => {
      const { onAction } = instance.props;
      onAction?.({ 
        type: isPressed ? 'pressed' : 'released', 
        id: instance.id 
      });
    }
  },

  fallback: props => {
    const { children, variant, disabled, width } = props;
    const buttonText = children || '';
    
    // Simple text-based button rendering
    const paddedText = width ? buttonText.padEnd(width - 4, ' ') : buttonText;
    
    // Different styling based on variant
    let buttonDisplay = '';
    switch (variant) {
      case 'secondary':
        buttonDisplay = `[ ${paddedText} ]`;
        break;
      case 'danger':
        buttonDisplay = `! ${paddedText} !`;
        break;
      default: // primary
        buttonDisplay = `< ${paddedText} >`;
    }
    
    // Add disabled indicator if needed
    if (disabled) {
      buttonDisplay = `(${buttonDisplay})`;
    }
    
    return [buttonDisplay];
  }
});
