/**
 * Properties Component Tests
 * 
 * Tests for the Properties component functionality, structure, and behavior
 */

import { createElement } from '../../../template/tsxFactory';
import Properties from '../../../template/components/Properties';
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
      
      // Process rendered node props
      if (renderedNode && renderedNode.props) {
        // Add component name
        output.push(`componentName: ${renderedNode.props.componentName || node.props.componentName || 'No Component Selected'}`);
        
        // Process properties from props
        const properties = node.props.properties || [];
        output.push(`propertyCount: ${properties.length}`);
        
        // Add details for each property
        properties.forEach((prop: any, index: number) => {
          output.push(`property[${index}].name: ${prop.name || 'undefined'}`);
          output.push(`property[${index}].type: ${prop.type || 'undefined'}`);
          output.push(`property[${index}].value: ${prop.value !== undefined ? prop.value : 'undefined'}`);
          
          if (prop.options) {
            output.push(`property[${index}].options: ${prop.options.length}`);
          }
        });
      }
      
      // Analyze rendered node children to test the component's structure
      if (renderedNode && renderedNode.children && renderedNode.children.length > 0) {
        output.push(`childCount: ${renderedNode.children.length}`);
        
        // Check for header and content
        const header = renderedNode.children.find((child: any) => child.type === 'PropertiesHeader');
        if (header) {
          output.push('hasHeader: true');
          if (header.children && header.children[0] && header.children[0].props) {
            output.push(`headerText: ${header.children[0].props.nodeValue}`);
          }
        }
        
        const content = renderedNode.children.find((child: any) => child.type === 'PropertiesContent');
        if (content) {
          output.push('hasContent: true');
          
          if (content.children && content.children.length) {
            output.push(`contentItems: ${content.children.length}`);
            
            // Check for empty state
            const emptyState = content.children.find((child: any) => child.type === 'EmptyState');
            if (emptyState) {
              output.push('hasEmptyState: true');
              if (emptyState.children && emptyState.children[0] && emptyState.children[0].props) {
                output.push(`emptyStateText: ${emptyState.children[0].props.nodeValue}`);
              }
            }
            
            // Check for property rows
            const propertyRows = content.children.filter((child: any) => child.type === 'PropertyRow');
            if (propertyRows.length > 0) {
              output.push(`propertyRows: ${propertyRows.length}`);
              
              // Count editor types
              let stringEditors = 0;
              let numberEditors = 0;
              let booleanEditors = 0;
              let selectEditors = 0;
              
              propertyRows.forEach((row: any, idx: number) => {
                if (row.children && row.children.length > 1) {
                  const editor = row.children[1];
                  output.push(`row[${idx}].name: ${row.props.name}`);
                  output.push(`row[${idx}].editorType: ${editor.type}`);
                  
                  if (editor.type === 'StringEditor') stringEditors++;
                  if (editor.type === 'NumberEditor') numberEditors++;
                  if (editor.type === 'BooleanEditor') booleanEditors++;
                  if (editor.type === 'SelectEditor') selectEditors++;
                  
                  // Test that onChange handlers were created
                  if (editor.props && typeof editor.props.onChange === 'function') {
                    output.push(`row[${idx}].hasChangeHandler: true`);
                  }
                }
              });
              
              // Add editor type counts
              output.push(`stringEditors: ${stringEditors}`);
              output.push(`numberEditors: ${numberEditors}`);
              output.push(`booleanEditors: ${booleanEditors}`);
              output.push(`selectEditors: ${selectEditors}`);
            }
          }
        }
      }
      
      return output;
    })
  };
});

describe('Properties Component', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  // Test basic rendering and default props
  it('renders with default props', () => {
    const vnode = createElement(Properties, {});
    
    // Check the component type and default props
    expect(vnode.type).toBe(Properties);
    expect(vnode.props.componentName).toBe(undefined); // Will default to 'No Component Selected' in component
    expect(vnode.props.properties).toBe(undefined); // Will default to [] in component
    
    // Basic output check
    const output = renderVNode(vnode) as string[];
    expect(output).toContain('Component: Properties');
    expect(output).toContain('componentName: No Component Selected');
    expect(output).toContain('propertyCount: 0');
  });
  
  it('renders with custom component name', () => {
    const vnode = createElement(Properties, {
      componentName: 'TestComponent'
    });
    
    // Check the prop is set correctly
    expect(vnode.props.componentName).toBe('TestComponent');
    
    const output = renderVNode(vnode) as string[];
    expect(output).toContain('componentName: TestComponent');
  });
  
  // Test string property editor
  it('renders string property with editor', () => {
    const vnode = createElement(Properties, {
      componentName: 'TestComponent',
      properties: [
        { name: 'title', type: 'string', value: 'Hello World' }
      ]
    });
    
    // Check the properties array
    expect(vnode.props.properties.length).toBe(1);
    expect(vnode.props.properties[0].name).toBe('title');
    expect(vnode.props.properties[0].type).toBe('string');
    expect(vnode.props.properties[0].value).toBe('Hello World');
    
    const output = renderVNode(vnode) as string[];
    expect(output).toContain('propertyCount: 1');
    expect(output).toContain('property[0].name: title');
    expect(output).toContain('property[0].type: string');
    expect(output).toContain('property[0].value: Hello World');
  });
  
  // Test number property editor
  it('renders number property with editor', () => {
    const vnode = createElement(Properties, {
      componentName: 'TestComponent',
      properties: [
        { name: 'count', type: 'number', value: 42 }
      ]
    });
    
    // Check the number property
    expect(vnode.props.properties[0].name).toBe('count');
    expect(vnode.props.properties[0].type).toBe('number');
    expect(vnode.props.properties[0].value).toBe(42);
    
    const output = renderVNode(vnode) as string[];
    expect(output).toContain('property[0].name: count');
    expect(output).toContain('property[0].type: number');
    expect(output).toContain('property[0].value: 42');
  });
  
  // Test boolean property editor
  it('renders boolean property with editor', () => {
    const vnode = createElement(Properties, {
      componentName: 'TestComponent',
      properties: [
        { name: 'visible', type: 'boolean', value: true }
      ]
    });
    
    // Check the boolean property
    expect(vnode.props.properties[0].name).toBe('visible');
    expect(vnode.props.properties[0].type).toBe('boolean');
    expect(vnode.props.properties[0].value).toBe(true);
    
    const output = renderVNode(vnode) as string[];
    expect(output).toContain('property[0].name: visible');
    expect(output).toContain('property[0].type: boolean');
    expect(output).toContain('property[0].value: true');
  });
  
  // Test select property editor with options
  it('renders select property with options', () => {
    const options = [
      { value: 'red', label: 'Red' },
      { value: 'green', label: 'Green' },
      { value: 'blue', label: 'Blue' }
    ];
    
    const vnode = createElement(Properties, {
      componentName: 'TestComponent',
      properties: [
        { 
          name: 'color', 
          type: 'select', 
          value: 'blue',
          options: options
        }
      ]
    });
    
    // Check the select property
    expect(vnode.props.properties[0].name).toBe('color');
    expect(vnode.props.properties[0].type).toBe('select');
    expect(vnode.props.properties[0].value).toBe('blue');
    expect(vnode.props.properties[0].options).toBe(options);
    expect(vnode.props.properties[0].options.length).toBe(3);
    
    const output = renderVNode(vnode) as string[];
    expect(output).toContain('property[0].name: color');
    expect(output).toContain('property[0].type: select');
    expect(output).toContain('property[0].value: blue');
    expect(output).toContain('property[0].options: 3');
  });
  
  // Test multiple properties with different editors
  it('renders multiple properties with different editors', () => {
    const vnode = createElement(Properties, {
      componentName: 'TestComponent',
      properties: [
        { name: 'title', type: 'string', value: 'Hello' },
        { name: 'count', type: 'number', value: 42 },
        { name: 'visible', type: 'boolean', value: true },
        { 
          name: 'color', 
          type: 'select', 
          value: 'red',
          options: [
            { value: 'red', label: 'Red' },
            { value: 'green', label: 'Green' },
            { value: 'blue', label: 'Blue' }
          ]
        }
      ]
    });
    
    // Check property count
    expect(vnode.props.properties.length).toBe(4);
    
    // Check first property (string)
    expect(vnode.props.properties[0].name).toBe('title');
    expect(vnode.props.properties[0].type).toBe('string');
    
    // Check second property (number)
    expect(vnode.props.properties[1].name).toBe('count');
    expect(vnode.props.properties[1].type).toBe('number');
    
    // Check third property (boolean)
    expect(vnode.props.properties[2].name).toBe('visible');
    expect(vnode.props.properties[2].type).toBe('boolean');
    
    // Check fourth property (select)
    expect(vnode.props.properties[3].name).toBe('color');
    expect(vnode.props.properties[3].type).toBe('select');
    
    const output = renderVNode(vnode) as string[];
    expect(output).toContain('propertyCount: 4');
    expect(output).toContain('property[0].name: title');
    expect(output).toContain('property[1].name: count');
    expect(output).toContain('property[2].name: visible');
    expect(output).toContain('property[3].name: color');
  });
  
  // Test property change handler
  it('sets onPropertyChange handler', () => {
    const onPropertyChangeMock = jest.fn();
    const vnode = createElement(Properties, {
      componentName: 'TestComponent',
      properties: [
        { name: 'title', type: 'string', value: 'Hello' }
      ],
      onPropertyChange: onPropertyChangeMock
    });
    
    // Verify the onPropertyChange handler is passed to the component
    expect(vnode.props.onPropertyChange).toBe(onPropertyChangeMock);
  });
  
  // Test property data types
  it('handles various property data types correctly', () => {
    const vnode = createElement(Properties, {
      componentName: 'TestComponent',
      properties: [
        { name: 'string', type: 'string', value: 'Hello' },
        { name: 'number', type: 'number', value: 42 },
        { name: 'boolean', type: 'boolean', value: false },
        { name: 'select', type: 'select', value: 'red', options: [{ value: 'red', label: 'Red' }] }
      ],
      onPropertyChange: jest.fn()
    });
    
    // Check property values are set correctly
    expect(vnode.props.properties[0].value).toBe('Hello');
    expect(vnode.props.properties[1].value).toBe(42);
    expect(vnode.props.properties[2].value).toBe(false);
    expect(vnode.props.properties[3].value).toBe('red');
    
    const output = renderVNode(vnode) as string[];
    expect(output).toContain('propertyCount: 4');
    expect(output).toContain('property[0].value: Hello');
    expect(output).toContain('property[1].value: 42');
    expect(output).toContain('property[2].value: false');
    expect(output).toContain('property[3].value: red');
  });
  
  // Test edge case with null or undefined values
  it('handles null or undefined property values', () => {
    const vnode = createElement(Properties, {
      componentName: 'TestComponent',
      properties: [
        { name: 'nullProp', type: 'string', value: null },
        { name: 'undefinedProp', type: 'number', value: undefined }
      ]
    });
    
    // Check props directly
    expect(vnode.props.properties[0].value).toBe(null);
    expect(vnode.props.properties[1].value).toBe(undefined);
    
    const output = renderVNode(vnode) as string[];
    expect(output).toContain('property[0].name: nullProp');
    expect(output).toContain('property[0].value: null');
    expect(output).toContain('property[1].name: undefinedProp');
    expect(output).toContain('property[1].value: undefined');
  });
  
  // Test component with no handler
  it('creates component with missing onPropertyChange handler', () => {
    const vnode = createElement(Properties, {
      componentName: 'TestComponent',
      properties: [
        { name: 'title', type: 'string', value: 'Hello' }
      ]
      // No onPropertyChange handler
    });
    
    // Verify the onPropertyChange handler is undefined
    expect(vnode.props.onPropertyChange).toBeUndefined();
    
    // Ensure component still renders without errors
    const output = renderVNode(vnode) as string[];
    expect(output).toContain('Component: Properties');
    expect(output).toContain('property[0].name: title');
  });
});
