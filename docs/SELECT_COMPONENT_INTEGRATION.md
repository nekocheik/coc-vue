# Select Component Integration Guide

This document provides comprehensive instructions for verifying that the Select component is properly integrated as a first-class module in the COC-VUE extension.

## Prerequisites

Before testing the integration, ensure you have:

1. A clean Neovim environment (optional, use `clean-setup.sh` to reset)
2. COC-VUE extension properly built and linked
3. Neovim with COC installed

## Verification Process

### 1. Build and Link the Extension

```bash
# Navigate to the extension directory
cd /Users/cheikkone/Desktop/Projects/coc-cheik-2/coc-vue

# Build the extension
npm run build

# Link the extension (if not already linked)
npm link
```

### 2. Verify Command Registration

Launch Neovim and check if the `VueUISelect` command is properly registered:

```vim
:command VueUISelect
```

Expected output: The command should be listed with its details.

### 3. Test Direct Command Execution

Execute the Select component directly using the Vim command:

```vim
:VueUISelect test_select "Select Demo" {"multi":false,"options":[{"id":"option1","text":"Option 1","value":"value1"},{"id":"option2","text":"Option 2","value":"value2"},{"id":"option3","text":"Option 3","value":"value3"}]}
```

Expected result: A Select component should appear with three options.

### 4. Test COC Command Integration

Execute the Select component through the COC command interface:

```vim
:CocCommand vue.selectDemo
```

Expected result: A Select component should appear with three options.

### 5. Test Keyboard Interactions

Once the Select component is open, test the following keyboard interactions:

- `j` or `Down`: Move focus to the next option
- `k` or `Up`: Move focus to the previous option
- `Enter`: Select the focused option
- `Space`: Toggle selection (in multi-select mode)
- `Esc`: Close the Select component

### 6. Automated Verification

For automated verification, run the provided verification script:

```vim
:source /Users/cheikkone/Desktop/Projects/coc-cheik-2/coc-vue/verify_integration.vim
```

This script will:
1. Check if the `VueUISelect` command is registered
2. Verify the runtime path includes the extension
3. Confirm that the Lua modules are properly loaded
4. Test direct command execution
5. Test COC command integration
6. Provide diagnostic information if any test fails

## Troubleshooting

If the integration verification fails, check the following:

### 1. Runtime Path Issues

Ensure the extension directory is in Neovim's runtime path:

```vim
:echo &runtimepath
```

The extension directory should be included in the output.

### 2. Module Loading Issues

Check if the Lua modules are properly loaded:

```vim
:lua print(require('vue-ui.init') ~= nil)
```

This should return `true` if the module is loaded correctly.

### 3. Command Registration Issues

If the `VueUISelect` command is not registered, try loading the module explicitly:

```vim
:lua require('vue-ui.init').define_commands()
```

### 4. COC Integration Issues

Check the COC logs for any errors:

```vim
:CocOpenLog
```

Look for any errors related to the Select component or command registration.

## Architecture Overview

The Select component integration involves two main layers:

1. **Lua Layer**: The core implementation of the Select component in `lua/vue-ui/components/select.lua`, with commands registered in `lua/vue-ui/init.lua`.

2. **TypeScript Layer**: The COC command interface in `src/index.ts` that bridges the TypeScript and Lua worlds.

The integration flow is as follows:

1. When COC loads the extension, it calls the `activate` function in `src/index.ts`.
2. The extension registers various commands, including `vue.selectDemo`.
3. When `vue.selectDemo` is executed, it calls the `VueUISelect` command in Neovim.
4. The `VueUISelect` command creates and opens a Select component using the Lua API.

## Conclusion

If all verification steps pass, the Select component is properly integrated as a first-class module in the COC-VUE extension and can be used reliably in a real Neovim+COC environment.
