/**
 * Row Component - Arranges child elements horizontally
 */
import { Props, createElement } from '../../tsxFactory';
import { createLuaComponent } from '../factory';

/**
 * Row component that arranges child elements horizontally
 */
const Row = createLuaComponent<Props, any>({
  componentName: 'Row',
  luaModule: "vue-ui.components.row",
  mapProps: (props: Props) => props,
  fallback: () => ['[Vum.Row fallback]']
});

// Mark component as Vum for renderer
(Row as any).__isVum = true;

export default Row;
