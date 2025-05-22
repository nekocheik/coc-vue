/**
 * FileExplorer Component
 * 
 * NO REACT. Project-native TSX factory only.
 * 
 * A tree-based file explorer component that displays project files.
 * Maps to a Coc-vue buffer with file navigation capabilities.
 * 
 * @module template/components/FileExplorer
 */

import { createElement, VNode, Props } from '../tsxFactory';

// Types for file system entries
interface FileSystemEntry {
  id: string;
  name: string;
  type: 'file' | 'directory';
  children?: FileSystemEntry[];
  path: string;
}

interface FileExplorerProps extends Props {
  rootPath?: string;
  onFileSelect?: (path: string) => void;
  // Initial state can be passed as props in our system
  selectedFile?: string | null;
  expandedDirs?: string[];
}

/**
 * File Explorer component for navigating file system
 */
export default function FileExplorer(props: FileExplorerProps): VNode {
  const { 
    rootPath = '/', 
    onFileSelect,
    selectedFile = null,
    expandedDirs = [] 
  } = props;
  
  // In our compiled system, we'd use an event system to track state changes
  // rather than React's useState
  
  // Mock file system for template - this would be populated from backend in real usage
  const fileSystem: FileSystemEntry[] = [
    {
      id: 'src',
      name: 'src',
      type: 'directory',
      path: '/src',
      children: [
        {
          id: 'components',
          name: 'components',
          type: 'directory',
          path: '/src/components',
          children: [
            {
              id: 'app.vue',
              name: 'App.vue',
              type: 'file',
              path: '/src/components/App.vue'
            },
            {
              id: 'navbar.vue',
              name: 'Navbar.vue',
              type: 'file',
              path: '/src/components/Navbar.vue'
            }
          ]
        },
        {
          id: 'main.ts',
          name: 'main.ts',
          type: 'file',
          path: '/src/main.ts'
        }
      ]
    },
    {
      id: 'package.json',
      name: 'package.json',
      type: 'file',
      path: '/package.json'
    },
    {
      id: 'README.md',
      name: 'README.md',
      type: 'file',
      path: '/README.md'
    }
  ];
  
  // Event handlers would map to the coc.nvim event system
  const handleToggleDirectory = (path: string) => {
    // This function would dispatch a message to the Neovim instance
    // through the WindowManager and BufferRouter
    console.log(`Toggle directory: ${path}`);
    // In the real implementation, we'd update the buffer content
  };
  
  const handleFileSelect = (path: string) => {
    // This would be handled by the actual Neovim instance
    console.log(`Select file: ${path}`);
    if (onFileSelect) {
      onFileSelect(path);
    }
  };
  
  // Helper to check if a path is expanded
  const isExpanded = (path: string): boolean => {
    return expandedDirs.includes(path);
  };
  
  // Build tree nodes recursively
  const buildTreeNodes = (entries: FileSystemEntry[], level = 0): VNode[] => {
    return entries.map(entry => {
      const isSelected = selectedFile === entry.path;
      const isDir = entry.type === 'directory';
      const expanded = isDir && isExpanded(entry.path);
      
      // Create children nodes if expanded directory
      const childNodes = (isDir && expanded && entry.children) ? 
        buildTreeNodes(entry.children, level + 1) : [];
      
      // Directory toggle or file icon
      const icon = {
        type: 'TEXT_NODE',
        props: { nodeValue: isDir ? (expanded ? '▼ ' : '► ') : '📄 ' },
        children: []
      };
      
      // Entry name
      const name = {
        type: 'TEXT_NODE',
        props: { nodeValue: entry.name },
        children: []
      };
      
      // Create the entry node
      return {
        type: 'FileEntry',
        props: {
          id: entry.id,
          path: entry.path,
          entryType: entry.type,
          level,
          selected: isSelected,
          onClick: () => {
            if (isDir) {
              handleToggleDirectory(entry.path);
            } else {
              handleFileSelect(entry.path);
            }
          }
        },
        children: [
          icon,
          name,
          ...childNodes
        ]
      };
    });
  };
  
  // Build the tree structure
  const treeNodes = buildTreeNodes(fileSystem);
  
  // Return the complete virtual node tree
  return {
    type: 'FileExplorer',
    props,
    children: [
      {
        type: 'FileExplorerHeader',
        props: {},
        children: [{
          type: 'Heading',
          props: { level: 3 },
          children: [{
            type: 'TEXT_NODE',
            props: { nodeValue: 'Explorer' },
            children: []
          }]
        }]
      },
      {
        type: 'FileExplorerTree',
        props: {},
        children: treeNodes
      }
    ]
  };
}
