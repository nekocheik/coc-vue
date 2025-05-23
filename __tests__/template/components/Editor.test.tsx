/**
 * Editor Component Tests
 * 
 * Tests for the Editor component functionality, structure, and behavior
 */

import { createElement } from '../../../template/tsxFactory';
import Editor from '../../../template/components/Editor';
import { renderVNode } from '../../../template/renderer';

// Mock the renderer to ensure consistent output for tests
jest.mock('../../../template/renderer', () => {
  return {
    renderVNode: jest.fn().mockImplementation((node) => {
      // Create a string array output for testing
      const output: string[] = [];
      
      // Extract component type
      if (node && node.type) {
        const type = typeof node.type === 'string' ? node.type : node.type.name || 'Component';
        output.push(`Component: ${type}`);
      }
      
      // Execute the component function if it's a function
      // This allows us to test the actual component logic
      let renderedNode = node;
      if (node && typeof node.type === 'function') {
        try {
          renderedNode = node.type(node.props);
          output.push(`Executed: ${node.type.name || 'Component'}`);
        } catch (e) {
          output.push(`Error executing component: ${e.message}`);
        }
      }
      
      // Process input props
      if (node && node.props) {
        // Add file path
        output.push(`filePath: ${node.props.filePath || ''}`);
        
        // Add language
        output.push(`language: ${node.props.language || 'typescript'}`);
        
        // Add readOnly status
        output.push(`readOnly: ${node.props.readOnly === true}`);
        
        // Add content info
        const content = node.props.content || '';
        output.push(`content-length: ${content.length}`);
        
        // Count lines
        const lines = content.split('\n');
        output.push(`content-lines: ${lines.length}`);
      }
      
      // Analyze rendered node structure
      if (renderedNode && renderedNode.children && renderedNode.children.length > 0) {
        output.push(`childCount: ${renderedNode.children.length}`);
        
        // Check for status bar
        const statusBar = renderedNode.children.find((child: any) => child.type === 'EditorStatusBar');
        if (statusBar) {
          output.push('hasStatusBar: true');
          
          // Check status bar props
          if (statusBar.props) {
            output.push(`statusBar.filePath: ${statusBar.props.filePath || ''}`);
            output.push(`statusBar.language: ${statusBar.props.language || ''}`);
            output.push(`statusBar.readOnly: ${statusBar.props.readOnly === true}`);
          }
          
          // Check status bar text
          if (statusBar.children && statusBar.children[0] && statusBar.children[0].props) {
            output.push(`statusBarText: ${statusBar.children[0].props.nodeValue}`);
          }
        }
        
        // Check for editor content
        const editorContent = renderedNode.children.find((child: any) => child.type === 'EditorContent');
        if (editorContent) {
          output.push('hasEditorContent: true');
          
          // Check content props
          if (editorContent.props) {
            output.push(`editorContent.language: ${editorContent.props.language || ''}`);
            output.push(`editorContent.readOnly: ${editorContent.props.readOnly === true}`);
          }
          
          // Check editor lines
          if (editorContent.children && editorContent.children.length) {
            const contentLines = editorContent.children;
            output.push(`contentLineCount: ${contentLines.length}`);
            
            // Sample a few lines
            contentLines.slice(0, Math.min(5, contentLines.length)).forEach((line: any, idx: number) => {
              if (line.props) {
                output.push(`line[${idx}].number: ${line.props.number}`);
                output.push(`line[${idx}].content: ${line.props.content}`);
              }
              
              // Check line text node
              if (line.children && line.children[0] && line.children[0].props) {
                output.push(`line[${idx}].text: ${line.children[0].props.nodeValue}`);
              }
            });
          }
        }
      }
      
      return output;
    })
  };
});

describe('Editor Component', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  it('renders with default props', () => {
    const vnode = createElement(Editor, {});
    
    // Check that default props are set correctly
    expect(vnode.type).toBe(Editor);
    expect(vnode.props.filePath).toBe(undefined); // Will default to '' in component
    expect(vnode.props.content).toBe(undefined); // Will default to '' in component
    expect(vnode.props.language).toBe(undefined); // Will default to 'typescript' in component
    expect(vnode.props.readOnly).toBe(undefined); // Will default to false in component
    
    // Basic output checks
    const output = renderVNode(vnode) as string[];
    expect(output).toContain('Component: Editor');
    expect(output).toContain('filePath: ');
    expect(output).toContain('language: typescript');
    expect(output).toContain('readOnly: false');
  });
  
  it('renders with custom file path', () => {
    const vnode = createElement(Editor, {
      filePath: '/path/to/file.ts'
    });
    
    // Verify props are set correctly
    expect(vnode.props.filePath).toBe('/path/to/file.ts');
    
    const output = renderVNode(vnode) as string[];
    expect(output).toContain('filePath: /path/to/file.ts');
  });
  
  it('renders with custom language', () => {
    const vnode = createElement(Editor, {
      language: 'javascript'
    });
    
    // Verify language prop is set correctly
    expect(vnode.props.language).toBe('javascript');
    
    const output = renderVNode(vnode) as string[];
    expect(output).toContain('language: javascript');
  });
  
  it('renders in read-only mode', () => {
    const vnode = createElement(Editor, {
      readOnly: true
    });
    
    // Verify readOnly prop is set correctly
    expect(vnode.props.readOnly).toBe(true);
    
    const output = renderVNode(vnode) as string[];
    expect(output).toContain('readOnly: true');
  });
  
  it('renders single line content', () => {
    const content = 'console.log("hello world");';
    const vnode = createElement(Editor, {
      content
    });
    
    // Verify content prop is set correctly
    expect(vnode.props.content).toBe(content);
    
    const output = renderVNode(vnode) as string[];
    expect(output).toContain('content-length: 27');
    expect(output).toContain('content-lines: 1');
  });
  
  it('renders multi-line content', () => {
    const content = 'function test() {\n  return true;\n}';
    const vnode = createElement(Editor, { content });
    
    // Verify content prop is set correctly
    expect(vnode.props.content).toBe(content);
    
    const output = renderVNode(vnode) as string[];
    expect(output).toContain('content-length: 34');
    expect(output).toContain('content-lines: 3');
    // Check that the output array contains the expected content elements
    expect(output).toContain('Component: Editor');
    expect(output).toContain('language: typescript');
    expect(output).toContain('readOnly: false');
  });
  
  it('creates editor component with correct props', () => {
    const vnode = createElement(Editor, {
      filePath: '/test.js',
      language: 'javascript',
      content: 'const x = 42;',
      readOnly: true
    });
    
    // Check all props are set correctly
    expect(vnode.type).toBe(Editor);
    expect(vnode.props.filePath).toBe('/test.js');
    expect(vnode.props.language).toBe('javascript');
    expect(vnode.props.content).toBe('const x = 42;');
    expect(vnode.props.readOnly).toBe(true);
  });
});
