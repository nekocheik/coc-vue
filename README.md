# CoC Vue Integration

## Integration Protocol

### Node.js <-> Command Server communication is stable.

The integration between Node.js and the command server has been established using a TCP-based communication protocol. The protocol implements the following commands:

1. **Ping/Pong**: Basic connectivity test
   - Client: `{"type": "ping", "id": "..."}`
   - Server: `{"type": "pong", "id": "..."}`

2. **Echo**: Server echoes back the data sent by the client
   - Client: `{"type": "echo", "id": "...", "data": any}`
   - Server: `{"type": "echo", "id": "...", "data": any}`

3. **Add**: Server adds two numbers and returns the result
   - Client: `{"type": "add", "id": "...", "a": number, "b": number}`
   - Server: `{"type": "result", "id": "...", "result": number}`

4. **Load Component**: Load a Vue UI component (currently only Select)
   - Client: `{"type": "load_component", "id": "...", "component": "Select"}`
   - Server: `{"type": "component_loaded", "id": "...", "component": "Select"}`

5. **Call Method**: Call a method on a loaded component
   - Client: `{"type": "call_method", "id": "...", "component": "Select", "method": string, "args": any[]}`
   - Server: `{"type": "method_called", "id": "...", "component": "Select", "method": string, "result": any}`

6. **Get State**: Get the current state of a component
   - Client: `{"type": "get_state", "id": "...", "component": "Select"}`
   - Server: `{"type": "state", "id": "...", "component": "Select", "state": any}`

7. **Set Props**: Update the props of a component
   - Client: `{"type": "set_props", "id": "...", "component": "Select", "props": any}`
   - Server: `{"type": "props_updated", "id": "...", "component": "Select"}`

8. **Unload Component**: Unload a component
   - Client: `{"type": "unload_component", "id": "...", "component": "Select"}`
   - Server: `{"type": "component_unloaded", "id": "...", "component": "Select"}`

All commands pass 100% automated tests. The protocol is ready for adding business logic commands (components, events, etc.).

## Testing

### Selective Test Execution

The test suite supports selective test execution, allowing you to run specific test sections instead of the entire test suite. This is particularly useful during development to focus on specific functionality.

#### Running Tests

```bash
# Run all tests
./scripts/run_component_tests.sh

# Run a specific test section
./scripts/run_component_tests.sh component-loading

# Run multiple test sections
./scripts/run_component_tests.sh "component-loading,option-selection"
```

#### Available Test Sections

- `component-loading` - Tests for loading components (valid and invalid)
- `component-state` - Tests for getting component state
- `dropdown-control` - Tests for opening/closing the dropdown
- `option-selection` - Tests for selecting options
- `props-update` - Tests for updating component properties
- `multi-select` - Tests for multi-select mode
- `navigation` - Tests for navigating through options
- `error-handling` - Tests for error handling
- `cleanup` - Tests for unloading components

## Select Component

The Select component supports the following methods:

- `open`: Open the dropdown menu
- `close`: Close the dropdown menu
- `focus_option`: Focus a specific option
- `focus_next_option`: Focus the next option
- `focus_prev_option`: Focus the previous option
- `select_option`: Select an option by index
- `select_current_option`: Select the currently focused option
- `select_by_value`: Select an option by its value
- `confirm`: Confirm the current selection
- `cancel`: Cancel the selection and close the menu
- `update_options`: Update the list of options
- `set_disabled`: Enable/disable the component

## Running the Server and Tests

### Starting the Command Server

```bash
# Start the Node.js command server
./scripts/run_command_server.sh
```

The server will start on `127.0.0.1:9999` and log all commands and responses.

### Running the Command Tests

```bash
# Run the command tests against the server
./scripts/run_node_command_tests.sh
```

This script will:
1. Start the command server
2. Run all the command tests
3. Display the test results and server logs
4. Clean up the server process

## Debugging

### Checking Errors in Neovim

Lorsque vous rencontrez des problèmes avec l'extension, il est important de vérifier les erreurs dans Neovim. Utilisez les commandes suivantes :

```vim
:messages       " Affiche les messages d'erreur de Neovim
:CocOpenLog     " Ouvre le fichier de log de Coc.nvim
```

Ces commandes sont essentielles pour identifier les problèmes lors de l'exécution des tests ou pendant le développement. Vérifiez toujours ces logs si vous rencontrez des comportements inattendus.

### Dépannage courant

- **Erreur "Component not found"** : Assurez-vous que le composant a été correctement chargé avant d'essayer d'interagir avec lui.
- **Problèmes de connexion au serveur** : Vérifiez que le port 9999 n'est pas déjà utilisé par un autre processus.
- **Erreurs asynchrones** : Si des opérations asynchrones ne se terminent pas correctement, utilisez l'option `--detectOpenHandles` avec Jest pour identifier les problèmes.

## Development

The current implementation provides a stable foundation for communication between Node.js and the command server. The next phase will involve implementing specific commands for the TypeScript <-> Lua bridge to handle component loading, method calls, state management, etc.

Development will proceed in a disciplined manner, with each phase being locked and verified before moving to the next.
