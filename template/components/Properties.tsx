/**
 * Properties Component
 * 
 * NO REACT. Project-native TSX factory only.
 * 
 * A properties panel component that displays and edits component properties.
 * Maps to a Coc-vue buffer with property editing capabilities.
 * 
 * @module template/components/Properties
 */

import { createElement, VNode, Props } from '../tsxFactory';

interface Property {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'select';
  value: any;
  options?: { value: string; label: string }[];
}

interface PropertiesProps extends Props {
  componentName?: string;
  properties?: Property[];
  onPropertyChange?: (name: string, value: any) => void;
}

/**
 * Properties component for editing component properties
 */
export default function Properties(props: PropertiesProps): VNode {
  const {
    componentName = 'No Component Selected',
    properties = [],
    onPropertyChange
  } = props;

  // Create property editor nodes
  const propertyNodes = properties.map(property => {
    // Create the appropriate editor based on property type
    let editor;
    
    switch (property.type) {
      case 'boolean':
        editor = {
          type: 'BooleanEditor',
          props: {
            value: property.value,
            onChange: (value: boolean) => onPropertyChange?.(property.name, value)
          },
          children: []
        };
        break;
        
      case 'number':
        editor = {
          type: 'NumberEditor',
          props: {
            value: property.value,
            onChange: (value: number) => onPropertyChange?.(property.name, value)
          },
          children: []
        };
        break;
        
      case 'select':
        editor = {
          type: 'SelectEditor',
          props: {
            value: property.value,
            options: property.options || [],
            onChange: (value: string) => onPropertyChange?.(property.name, value)
          },
          children: []
        };
        break;
        
      case 'string':
      default:
        editor = {
          type: 'StringEditor',
          props: {
            value: property.value,
            onChange: (value: string) => onPropertyChange?.(property.name, value)
          },
          children: []
        };
    }
    
    // Return the property row
    return {
      type: 'PropertyRow',
      props: { name: property.name },
      children: [
        {
          type: 'PropertyLabel',
          props: {},
          children: [{
            type: 'TEXT_NODE',
            props: { nodeValue: property.name },
            children: []
          }]
        },
        editor
      ]
    };
  });

  // Default content if no properties
  if (propertyNodes.length === 0) {
    propertyNodes.push({
      type: 'EmptyState',
      props: { name: 'EmptyProperties' },
      children: [{
        type: 'TEXT_NODE',
        props: { nodeValue: 'No properties to display. Select a component.' },
        children: []
      }]
    });
  }

  // Return the properties component
  return {
    type: 'Properties',
    props,
    children: [
      {
        type: 'PropertiesHeader',
        props: {},
        children: [{
          type: 'TEXT_NODE',
          props: { nodeValue: componentName },
          children: []
        }]
      },
      {
        type: 'PropertiesContent',
        props: {},
        children: propertyNodes
      }
    ]
  };
}
