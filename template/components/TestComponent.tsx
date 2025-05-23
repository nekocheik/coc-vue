/**
 * TestComponent
 * 
 * A simple test component that can be used in place of other components
 * to verify the rendering pipeline and layout.
 */

// The createElement import is needed for JSX transformation but not directly referenced
// @ts-ignore - required for JSX
import { createElement, VNode, Props } from '../tsxFactory';

interface TestComponentProps extends Props {
  title?: string;
  slot?: string;
}

/**
 * A simple test component that can be used to verify the layout rendering
 */
export default function TestComponent(props: TestComponentProps): VNode {
  const title = props.title || 'Test Component';
  const slot = props.slot || 'unknown';
  
  return {
    type: 'TestComponent',
    props,
    children: [
      {
        type: 'TEXT_NODE',
        props: {
          nodeValue: `# ${title} (${slot})\n\nThis is a test component used to verify layout rendering.\n\nSlot: ${slot}\nTimestamp: ${new Date().toISOString()}`
        },
        children: []
      }
    ]
  };
}
