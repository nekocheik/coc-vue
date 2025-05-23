/**
 * Component - Hybrid wrapper for Lua components
 * 
 * This component allows dynamically specifying the Lua module to use,
 * enabling a more flexible approach to component rendering.
 */
import { VNode, Props } from '../../tsxFactory';
import { createLuaComponent } from '../factory';

// Extended props interface with component property
interface ComponentProps extends Props {
  component: string;
}

/**
 * Dynamic Component - creates a Lua-backed component on the fly
 */
const Component = createLuaComponent<ComponentProps, any>({
  componentName: 'Component',
  luaModule: (p) => p.component,          // dynamically determine module from props
  mapProps: (p) => {
    // Copy all props except 'component' which is used internally
    const { component, ...rest } = p;
    return rest;
  },
  fallback: () => ['[Component: no module specified]']
});

// Mark the component as Vum for renderer detection
(Component as any).__isVum = true;

export default Component;
