import { VNode } from '../tsxFactory';

declare global {
  namespace JSX {
    type Element = VNode;
    
    // Define common props that most Vum components can accept
    interface VumBaseProps {
      id?: string;
      className?: string;
      style?: string | Record<string, any>;
      [key: string]: any;
    }
    
    interface IntrinsicElements {
      // Basic layout components
      Row: VumBaseProps & { children?: Element | Element[] };
      Col: VumBaseProps & { children?: Element | Element[] };
      Text: VumBaseProps & { value: string };
      
      // Interactive components
      Button: VumBaseProps & { onClick?: () => void, text?: string, children?: Element | Element[] };
      Select: VumBaseProps & { options?: any[], value?: any, onChange?: (value: any) => void };
      Input: VumBaseProps & { value?: string, onChange?: (value: string) => void, placeholder?: string };
      Modal: VumBaseProps & { visible?: boolean, onClose?: () => void, children?: Element | Element[] };
      
      // Dynamic component carrier
      Component: { component: string; [key: string]: any };
    }
  }
}

// Make this a proper module
export {};
