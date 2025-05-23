/**
 * Col Component - Arranges child elements vertically
 */
import { Props } from '../../tsxFactory';
import { createLuaComponent } from '../factory';

/**
 * Col component that arranges child elements vertically
 */
const Col = createLuaComponent<Props, any>({
  componentName: 'Col',
  luaModule: "vue-ui.components.col",
  mapProps: (props) => props,
  fallback: () => ['[Col component]']
});

// Mark component as Vum for renderer
(Col as any).__isVum = true;

export default Col;
