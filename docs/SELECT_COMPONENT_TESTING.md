# Select Component Manual Testing Guide

This guide provides instructions for manually testing the refactored Select component in the COC-VUE extension.

## Overview

The Select component has been refactored to use the new core modules (`core_state`, `core_event`, `core_options`, `core_keymap`, and `core_render`) while maintaining 100% behavioral parity with the legacy implementation. This document outlines how to manually test the component to verify its functionality.

## Prerequisites

- Neovim with COC.nvim installed
- COC-VUE extension installed and configured
- The refactored Select component integrated into the extension

## Testing Methods

There are two primary ways to test the Select component:

1. Using the CocCommand interface
2. Using the VueUISelect command directly

## Method 1: Using CocCommand

1. Open Neovim
2. Run the following command:
   ```
   :CocCommand vue.selectDemo
   ```
3. A Select component will appear with three options: "Option 1", "Option 2", and "Option 3"

## Method 2: Using VueUISelect Command

1. Open Neovim
2. Run the following command:
   ```
   :VueUISelect test_select "My Select Component" {"multi":false,"options":[{"id":"option1","text":"Option 1","value":"value1"},{"id":"option2","text":"Option 2","value":"value2"},{"id":"option3","text":"Option 3","value":"value3"}]}
   ```
3. A Select component will appear with the specified options

## Testing Multi-Select Mode

To test the multi-select functionality:

```
:VueUISelect multi_select "Multi Select Demo" {"multi":true,"options":[{"id":"option1","text":"Option 1","value":"value1"},{"id":"option2","text":"Option 2","value":"value2"},{"id":"option3","text":"Option 3","value":"value3"}]}
```

## Keyboard Navigation

Once the Select component is open, you can use the following keyboard shortcuts:

- `j` or `Down`: Move focus to the next option
- `k` or `Up`: Move focus to the previous option
- `Enter`: Select the currently focused option
- `Space`: Toggle selection (in multi-select mode)
- `Ctrl+Enter`: Confirm selection (in multi-select mode)
- `Esc`: Cancel/close the Select component

## Verifying Event Logs

To verify that events are being properly emitted:

1. Open the Select component using one of the methods above
2. Interact with the component (navigate, select options, etc.)
3. Run the following command to save the event log:
   ```
   :VueUISaveEventLog
   ```
4. Check the saved log file (default location: `~/.local/share/nvim/ui_events_select.json`)

## Troubleshooting

If the Select component does not appear:

1. Check the COC log for errors:
   ```
   :CocCommand workspace.showOutput
   ```
2. Ensure that the refactored Select component is properly registered in `lua/vue-ui/init.lua`
3. Verify that the core modules are properly imported in the Select component file

## Expected Behavior

- The Select component should open in a new buffer
- Navigation should work as expected (up/down movement)
- Selection should work as expected (Enter key)
- Multi-select mode should allow toggling multiple options
- Events should be properly emitted (check logs)
- The component should close when Esc is pressed

## Reporting Issues

If you encounter any issues with the refactored Select component, please report them with the following information:

1. Steps to reproduce
2. Expected behavior
3. Actual behavior
4. COC log output
5. Event log (if available)
