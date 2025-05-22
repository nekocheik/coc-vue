/**
 * Main application entry point for the Coc-vue template system
 * 
 * NO REACT. Project-native TSX factory only.
 * 
 * This file defines the root component structure that will be rendered in Neovim.
 * It uses a component composition pattern where each Window.Slot corresponds
 * to a specific area in the Neovim layout managed by the WindowManager.
 * 
 * @module template/index
 */

import { createElement, VNode } from './tsxFactory';
import Window from './Window';
import Select from './components/Select';
import FileExplorer from './components/FileExplorer';
import Editor from './components/Editor';
import Console from './components/Console';
import Properties from './components/Properties';

/**
 * Main application component that defines the full UI layout
 * Each child component is mounted in a specific slot in the Window
 * 
 * @returns VNode The root virtual node tree for the application
 */
export default function App(): VNode {
  console.log('[Template] Starting App component rendering');
  
  // Create the FileExplorer component for the left slot
  const fileExplorerNode = createElement(FileExplorer, {});
  
  // Create the Editor component for the center-top slot
  const editorNode = createElement(Editor, {
    filePath: 'example.vue',
    language: 'vue'
  });
  
  // Create the Console component for the center-bottom slot
  const consoleNode = createElement(Console, {
    logs: [
      { type: 'info', message: 'Application started', timestamp: Date.now() }
    ]
  });
  
  // Create the Properties component for the right slot
  const propertiesNode = createElement(Properties, {
    componentName: 'App',
    properties: [
      { name: 'theme', type: 'select', value: 'dark', options: [
        { value: 'dark', label: 'Dark' },
        { value: 'light', label: 'Light' }
      ]}
    ]
  });
  
  // Create window slots
  const leftSlot = createElement(Window.Slot, { name: 'left' }, fileExplorerNode);
  const centerTopSlot = createElement(Window.Slot, { name: 'center-top' }, editorNode);
  const centerBottomSlot = createElement(Window.Slot, { name: 'center-bottom' }, consoleNode);
  const rightSlot = createElement(Window.Slot, { name: 'right' }, propertiesNode);
  
  // Create tabs for the top bar
  const homeTab = createElement(Window.Tab, { name: 'Home', active: true });
  const componentsTab = createElement(Window.Tab, { name: 'Components' });
  const settingsTab = createElement(Window.Tab, { name: 'Settings' });
  const helpTab = createElement(Window.Tab, { name: 'Help' });
  
  // Create the tabs container
  const tabsContainer = createElement(Window.Tabs, {}, [
    homeTab,
    componentsTab,
    settingsTab,
    helpTab
  ]);
  
  // Create the top bar
  const topBar = createElement(Window.Bar, { position: 'top' }, tabsContainer);
  
  // Create the status text for the bottom bar
  const statusText = { type: 'TEXT_NODE', props: { nodeValue: 'Ready' }, children: [] };
  
  // Create the status container
  const statusContainer = createElement(Window.Status, {}, statusText);
  
  // Create the bottom bar
  const bottomBar = createElement(Window.Bar, { position: 'bottom' }, statusContainer);
  
  // Create the window root
  return createElement(Window, {}, [
    leftSlot,
    centerTopSlot,
    centerBottomSlot,
    rightSlot,
    topBar,
    bottomBar
  ]);
}
