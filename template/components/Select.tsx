/**
 * Select Component
 * 
 * NO REACT. Project-native TSX factory only.
 * 
 * A dropdown select component that can be used in any part of the UI.
 * Maps to a Coc-vue buffer with select functionality.
 * 
 * @module template/components/Select
 */

import { createElement, VNode, Props } from '../tsxFactory';

interface SelectProps extends Props {
  options: { value: string; label: string }[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
}

/**
 * Select dropdown component
 * Renders a selectable dropdown with options
 */
export default function Select(props: SelectProps): VNode {
  const { 
    options, 
    value = '', 
    onChange, 
    placeholder = 'Select an option...'
  } = props;
  
  // Find the current selected option label
  const selectedLabel = options.find(opt => opt.value === value)?.label || placeholder;
  
  // Child nodes for the options
  const optionNodes = options.map(option => ({
    type: 'Option',
    props: {
      value: option.value,
      selected: value === option.value,
      // In our compiled version, this would map to a Neovim callback
      onClick: () => onChange?.(option.value)
    },
    children: [{
      type: 'TEXT_NODE',
      props: { nodeValue: option.label },
      children: []
    }]
  }));
  
  return {
    type: 'Select',
    props,
    children: [
      {
        type: 'SelectValue',
        props: {},
        children: [{
          type: 'TEXT_NODE',
          props: { nodeValue: selectedLabel },
          children: []
        }]
      },
      {
        type: 'SelectDropdown',
        props: {},
        children: optionNodes
      }
    ]
  };
}
