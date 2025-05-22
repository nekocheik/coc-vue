/**
 * Console Component
 * 
 * NO REACT. Project-native TSX factory only.
 * 
 * A console component that displays logs, warnings, and errors.
 * Maps to a Coc-vue buffer with console output capabilities.
 * 
 * @module template/components/Console
 */

import { createElement, VNode, Props } from '../tsxFactory';

interface LogEntry {
  type: 'info' | 'warning' | 'error';
  message: string;
  timestamp: number;
}

interface ConsoleProps extends Props {
  logs?: LogEntry[];
  autoScroll?: boolean;
}

/**
 * Console component for displaying logs and output
 */
export default function Console(props: ConsoleProps): VNode {
  const {
    logs = [],
    autoScroll = true
  } = props;

  // Create log entry nodes
  const logNodes = logs.map((log, index) => {
    const timestamp = new Date(log.timestamp).toLocaleTimeString();
    
    return {
      type: 'LogEntry',
      props: {
        logType: log.type,
        key: index
      },
      children: [
        {
          type: 'LogTimestamp',
          props: {},
          children: [{
            type: 'TEXT_NODE',
            props: { nodeValue: timestamp },
            children: []
          }]
        },
        {
          type: 'LogIcon',
          props: { logType: log.type },
          children: [{
            type: 'TEXT_NODE',
            props: { nodeValue: log.type === 'info' ? 'ℹ️' : log.type === 'warning' ? '⚠️' : '❌' },
            children: []
          }]
        },
        {
          type: 'LogMessage',
          props: {},
          children: [{
            type: 'TEXT_NODE',
            props: { nodeValue: log.message },
            children: []
          }]
        }
      ]
    };
  });

  // Default content if no logs
  if (logNodes.length === 0) {
    logNodes.push({
      type: 'LogEntry',
      props: { logType: 'info', key: 0 },
      children: [{
        type: 'LogMessage',
        props: {},
        children: [{
          type: 'TEXT_NODE',
          props: { nodeValue: 'Console is empty. Run a command to see output here.' },
          children: []
        }]
      }]
    });
  }

  // Console toolbar
  const toolbar = {
    type: 'ConsoleToolbar',
    props: {},
    children: [
      {
        type: 'ConsoleButton',
        props: { action: 'clear' },
        children: [{
          type: 'TEXT_NODE',
          props: { nodeValue: 'Clear' },
          children: []
        }]
      },
      {
        type: 'ConsoleButton',
        props: { action: 'filter', filterType: 'all' },
        children: [{
          type: 'TEXT_NODE',
          props: { nodeValue: 'All' },
          children: []
        }]
      }
    ]
  };

  // Return the console component
  return {
    type: 'Console',
    props,
    children: [
      toolbar,
      {
        type: 'ConsoleOutput',
        props: { autoScroll },
        children: logNodes
      }
    ]
  };
}
