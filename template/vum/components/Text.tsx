/**
 * Text Component - Simple text display
 */
import { Props } from '../../tsxFactory';
import { createLuaComponent } from '../factory';

/**
 * Props specific to the Text component
 */
interface TextProps extends Props {
  value: string;
}

/**
 * Text component that displays text content
 */
const Text = createLuaComponent<TextProps, any>({
  componentName: 'Text',
  luaModule: 'vue-ui.components.text',
  mapProps: (props: TextProps) => props,
  fallback: (props: TextProps) => [`[Text: ${props.value}]`]
});

// Mark component as Vum for renderer
(Text as any).__isVum = true;

export default Text;
