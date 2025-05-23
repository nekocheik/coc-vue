/**
 * Modal Component - Overlay dialog window
 * 
 * This component bridges between TypeScript and Lua rendering
 */
import { createLuaComponent } from '../factory';

export interface ModalProps {
  title: string;
  content?: string;
  visible?: boolean;
  width?: number;
  height?: number;
  buttons?: Array<{
    text: string;
    value: string;
    variant?: 'primary' | 'secondary' | 'danger';
  }>;
  /** Emits when user clicks a button */
  onButtonClick?: (value: string) => void;
  /** Emits when user closes the modal */
  onClose?: () => void;
  /** Emits when any action is performed */
  onAction?: (action: { type: string, id?: string, value?: string }) => void;
}

/**
 * Helper to convert button variant to Lua style
 */
function variantToStyle(variant?: string): string {
  switch (variant) {
    case 'secondary': return 'default';
    case 'danger': return 'error';
    default: return 'primary';
  }
}

export default createLuaComponent<ModalProps, any>({
  luaModule: 'vue-ui.components.modal',
  
  mapProps: props => ({
    title: props.title,
    content: props.content || '',
    width: props.width || 50,
    height: props.height || 10,
    is_visible: props.visible !== false, // default to true if not specified
    buttons: props.buttons?.map(btn => ({
      text: btn.text,
      value: btn.value,
      style: variantToStyle(btn.variant)
    })) || []
  }),
  
  events: {
    'modal_button_click': (instance, value: string) => {
      const { props } = instance;
      
      // Call specific handler if provided
      props.onButtonClick?.(value);
      
      // Emit generic action event
      props.onAction?.({
        type: 'button_click',
        value: value,
        id: instance.id
      });
    },
    'modal_close': (instance) => {
      const { props } = instance;
      
      // Call specific handler if provided
      props.onClose?.();
      
      // Emit generic action event
      props.onAction?.({
        type: 'close',
        id: instance.id
      });
    },
    'modal_keypress': (instance, key: string) => {
      // Emit action event for key press
      instance.props.onAction?.({
        type: 'keypress',
        value: key,
        id: instance.id
      });
    }
  },
  
  fallback: props => {
    const { title, content, width: propWidth, buttons } = props;
    const width = propWidth || 50;
    const lines: string[] = [];
    
    // Top border
    lines.push('┌' + '─'.repeat(width - 2) + '┐');
    
    // Title bar
    const paddedTitle = ` ${title} `;
    const titleLine = '│' + paddedTitle.padEnd(width - 2, ' ') + '│';
    lines.push(titleLine);
    
    // Separator
    lines.push('├' + '─'.repeat(width - 2) + '┤');
    
    // Content
    if (content) {
      const contentLines = content.split('\n');
      contentLines.forEach(line => {
        const paddedLine = ' ' + line;
        lines.push('│' + paddedLine.padEnd(width - 2, ' ') + '│');
      });
    } else {
      lines.push('│' + ' '.repeat(width - 2) + '│');
    }
    
    // Button area
    if (buttons && buttons.length > 0) {
      lines.push('├' + '─'.repeat(width - 2) + '┤');
      
      // Create button display
      const buttonTexts = buttons.map(btn => {
        switch (btn.variant) {
          case 'secondary': return `[ ${btn.text} ]`;
          case 'danger': return `! ${btn.text} !`;
          default: return `< ${btn.text} >`;
        }
      });
      
      const buttonsLine = '│ ' + buttonTexts.join('  ') + ' '.repeat(Math.max(0, width - 3 - buttonTexts.join('  ').length)) + '│';
      lines.push(buttonsLine);
    }
    
    // Bottom border
    lines.push('└' + '─'.repeat(width - 2) + '┘');
    
    return lines;
  }
});
