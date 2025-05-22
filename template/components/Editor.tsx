/**
 * Editor Component
 * 
 * NO REACT. Project-native TSX factory only.
 * 
 * An editor component that displays and edits file content.
 * Maps to a Coc-vue buffer with editing capabilities.
 * 
 * @module template/components/Editor
 */

import { createElement, VNode, Props } from '../tsxFactory';

interface EditorProps extends Props {
  filePath?: string;
  content?: string;
  language?: string;
  readOnly?: boolean;
}

/**
 * Editor component for displaying and editing file content
 */
export default function Editor(props: EditorProps): VNode {
  const {
    filePath = '',
    content = '',
    language = 'typescript',
    readOnly = false
  } = props;

  // This would map to a Neovim buffer with editing capabilities
  // In the actual implementation, this would connect to the bufferRouter
  
  // Create content line nodes
  const contentLines = content.split('\n').map((line, index) => ({
    type: 'EditorLine',
    props: { 
      number: index + 1,
      content: line
    },
    children: [{
      type: 'TEXT_NODE',
      props: { nodeValue: line },
      children: []
    }]
  }));

  // Create the editor status bar
  const statusBar = {
    type: 'EditorStatusBar',
    props: {
      filePath,
      language,
      readOnly
    },
    children: [{
      type: 'TEXT_NODE',
      props: { nodeValue: `${filePath} - ${language}${readOnly ? ' (Read Only)' : ''}` },
      children: []
    }]
  };

  // Return the editor component
  return {
    type: 'Editor',
    props,
    children: [
      statusBar,
      {
        type: 'EditorContent',
        props: {
          language,
          readOnly
        },
        children: contentLines
      }
    ]
  };
}
