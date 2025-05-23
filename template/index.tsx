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

// createElement is required for JSX transformation even when using JSX syntax
import { createElement, VNode } from './tsxFactory';
import Window from './Window';
import FileExplorer from './components/FileExplorer';
import Editor from './components/Editor';
import Console from './components/Console';
import Properties from './components/Properties';

// We've created a TestComponent for layout testing, but we're not using it now
// If needed for debugging, uncomment this line
// import TestComponent from './components/TestComponent';

/**
 * Main application component that defines the full UI layout
 * Each child component is mounted in a specific slot in the Window
 * 
 * @returns VNode The root virtual node tree for the application
 */
export default function App(): VNode {
  console.log('[Template] Starting App component rendering');
  
  return (
    <Window>
      {/* Left slot with file explorer */}
      <Window.Slot name="left">
        <FileExplorer />
      </Window.Slot>
      
      {/* Center-top slot with editor */}
      <Window.Slot name="center-top">
        <Editor filePath="example.vue" language="vue" />
      </Window.Slot>
      
      {/* Center-bottom slot with console */}
      <Window.Slot name="center-bottom">
        <Console logs={[
          { type: 'info', message: 'Application started', timestamp: Date.now() }
        ]} />
      </Window.Slot>
      
      {/* Right slot with properties panel */}
      <Window.Slot name="right">
        <Properties 
          componentName="App"
          properties={[
            { 
              name: 'theme', 
              type: 'select', 
              value: 'dark', 
              options: [
                { value: 'dark', label: 'Dark' },
                { value: 'light', label: 'Light' }
              ]
            }
          ]}
        />
      </Window.Slot>
      
      {/* Top bar with tabs */}
      <Window.Bar position="top">
        <Window.Tabs>
          <Window.Tab name="Home" active={true} />
          <Window.Tab name="Components" />
          <Window.Tab name="Settings" />
          <Window.Tab name="Help" />
        </Window.Tabs>
      </Window.Bar>
      
      {/* Bottom bar with status */}
      <Window.Bar position="bottom">
        <Window.Status>
          {/* Text node for status message */}
          Ready
        </Window.Status>
      </Window.Bar>
    </Window>
  );
}
