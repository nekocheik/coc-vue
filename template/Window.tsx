/**
 * Window Component
 * 
 * NO REACT. Project-native TSX factory only.
 * 
 * A component that represents the main layout window in Neovim.
 * Manages slots and bars for the WindowManager system.
 * 
 * @module template/Window
 */

import { createElement, VNode, Props, MountRegistry } from './tsxFactory';

// Define types for props
interface WindowProps extends Props {}

interface SlotProps extends Props {
  name: 'left' | 'center-top' | 'center-bottom' | 'right';
}

interface BarProps extends Props {
  position: 'top' | 'bottom';
}

interface TabProps extends Props {
  name: string;
  active?: boolean;
}

interface TabsProps extends Props {}

interface StatusProps extends Props {}

/**
 * Main Window component that serves as the root container for the layout
 * Maps directly to the WindowManager in Coc-vue
 */
function Window(props: WindowProps): VNode {
  // Process children to capture slots and bars
  // This will be used by the WindowManager to mount the actual Neovim buffers
  
  // Reset the registry before processing a new window layout
  MountRegistry.reset();
  
  return {
    type: 'Window',
    props,
    children: props.children ? 
      (Array.isArray(props.children) ? props.children : [props.children]) : 
      []
  };
}

/**
 * Slot component for mounting content in a specific window region
 * Maps to windowManager.mountBuffer
 */
function Slot(props: SlotProps): VNode {
  // Register this slot with the MountRegistry for later buffer creation
  const node = {
    type: 'Slot',
    props,
    children: props.children ? 
      (Array.isArray(props.children) ? props.children : [props.children]) : 
      []
  };
  
  MountRegistry.registerSlot(props.name, node);
  
  return node;
}

/**
 * Bar component for displaying UI bars at the top or bottom
 * Maps to the bar content in WindowManager
 */
function Bar(props: BarProps): VNode {
  // Register this bar with the MountRegistry
  const node = {
    type: 'Bar',
    props,
    children: props.children ? 
      (Array.isArray(props.children) ? props.children : [props.children]) : 
      []
  };
  
  MountRegistry.registerBar(props.position, node);
  
  return node;
}

/**
 * Tab component for rendering a clickable tab in the top bar
 */
function Tab(props: TabProps): VNode {
  return {
    type: 'Tab',
    props,
    children: []
  };
}

/**
 * Tabs container for organizing multiple tabs in the bar
 */
function Tabs(props: TabsProps): VNode {
  return {
    type: 'Tabs',
    props,
    children: props.children ? 
      (Array.isArray(props.children) ? props.children : [props.children]) : 
      []
  };
}

/**
 * Status component for displaying status information in the bottom bar
 */
function Status(props: StatusProps): VNode {
  return {
    type: 'Status',
    props,
    children: props.children ? 
      (Array.isArray(props.children) ? props.children : [props.children]) : 
      []
  };
}

// Attach subcomponents to the Window
Window.Slot = Slot;
Window.Bar = Bar;
Window.Tab = Tab;
Window.Tabs = Tabs;
Window.Status = Status;

export default Window;
