#!/bin/bash
# Script to run integration tests with Jest and mock server

# Import common functions
source scripts/test/utils/common.sh

# Set global timeout (in seconds)
MAX_TIMEOUT=${MAX_TIMEOUT:-300}  # 5 minutes default

# Cleanup function on exit
cleanup() {
  local force=$1

  # Stop mock server
  if [ -n "$SERVER_PID" ]; then
    print_info "Stopping mock server (PID: $SERVER_PID)..."
    kill $SERVER_PID 2>/dev/null

    # Check if process is still running
    if [ "$force" = "true" ] && kill -0 $SERVER_PID 2>/dev/null; then
      print_info "Force stopping mock server..."
      kill -9 $SERVER_PID 2>/dev/null
    fi
  fi

  # Kill Jest process if still running
  if [ -n "$JEST_PID" ]; then
    print_info "Stopping Jest process (PID: $JEST_PID)..."
    kill $JEST_PID 2>/dev/null

    # Check if process is still running
    if [ "$force" = "true" ] && kill -0 $JEST_PID 2>/dev/null; then
      print_info "Force stopping Jest..."
      kill -9 $JEST_PID 2>/dev/null
    fi
  fi

  # Free used ports
  rm -f .server-info.json

  print_success "Cleanup completed."
}

# Display header
print_header "Running COC-Vue Integration Tests"
print_info "Timeout set to ${MAX_TIMEOUT} seconds"

# Check prerequisites
check_prerequisites

# Set up trap to clean up on interruption
trap 'cleanup true' EXIT INT TERM

# Export test environment variables
export NODE_ENV=test
export MOCK_NEOVIM=true

# Start mock server
print_info "Starting mock server for tests..."
node scripts/test/mock-server.js &
SERVER_PID=$!

# Wait for server to be ready (check .server-info.json file)
print_info "Waiting for server to start..."
MAX_WAIT=30
for ((i=1; i<=MAX_WAIT; i++)); do
  if [ -f .server-info.json ]; then
    SERVER_PORT=$(grep -o '"port":[0-9]\+' .server-info.json | grep -o '[0-9]\+')
    print_success "Mock server started on port $SERVER_PORT."
    break
  fi

  # If we reach the last attempt, fail
  if [ $i -eq $MAX_WAIT ]; then
    print_error "Mock server did not start after $MAX_WAIT seconds."
    print_info "Check logs in /tmp/mock-server.log for details."
    cleanup true
    exit 1
  fi

  sleep 1
done

# Export server port for tests
export MOCK_SERVER_PORT=$SERVER_PORT

print_info "Running integration tests..."

# Run integration tests with Jest in background
npx jest --config ./test/integration-jest.config.js &
JEST_PID=$!

# Monitor Jest process with timeout
SECONDS=0
EXIT_CODE=""

# Check if timeout is reached
while [ $SECONDS -lt $MAX_TIMEOUT ]; do
  if ! kill -0 $JEST_PID 2>/dev/null; then
    break
  fi

  # Wait 1 second and increment counter
  sleep 1

  # Show a dot every 10 seconds to show script is still active
  if [ $((SECONDS % 10)) -eq 0 ]; then
    echo -n "."
  fi
done

# If Jest is still running after timeout
if kill -0 $JEST_PID 2>/dev/null; then
  print_error "Tests exceeded timeout of ${MAX_TIMEOUT} seconds."
  print_error "Force stopping tests..."
  EXIT_CODE=124
  cleanup true
fi

# Wait for Jest to finish (if not killed)
wait $JEST_PID
JEST_EXIT=$?

# If EXIT_CODE is not set (no timeout), use Jest's exit code
if [ -z "$EXIT_CODE" ]; then
  EXIT_CODE=$JEST_EXIT
fi

# Clean up processes
cleanup false

if [ $EXIT_CODE -eq 0 ]; then
  print_success "All integration tests passed!"
else
  print_error "Some integration tests failed."
  print_info "To see detailed logs, run with VERBOSE_LOGS=true:"
  echo "VERBOSE_LOGS=true npm run test:integration"
fi

exit $EXIT_CODE
