# CoC Vue Integration

## Integration Protocol

### Ping-pong protocol between Node and NeoVim: OK, proof of working communication.

The integration between Node.js and NeoVim has been established using a TCP-based communication protocol. The protocol implements a simple ping-pong mechanism where:

1. The client sends a message with `{"type": "ping", "id": "..."}` 
2. The server responds with `{"type": "pong", "id": "..."}` using the same ID

This ensures reliable bidirectional communication between the TypeScript client and the Lua server running in NeoVim.

## Development

More details to be added as development progresses.
