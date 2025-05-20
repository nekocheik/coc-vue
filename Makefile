# Makefile for COC-Vue project
# Provides easy commands for running tests and other common tasks

# Default shell
SHELL := /bin/bash

# Project directories
PROJECT_ROOT := $(shell pwd)
SCRIPTS_DIR := $(PROJECT_ROOT)/scripts
TEST_DIR := $(SCRIPTS_DIR)/test

# Environment variables
VERBOSE ?= false
TIMEOUT ?= 300

# Define phony targets (targets that don't represent files)
.PHONY: all test test-unit test-integration test-component test-command test-ping clean help

# Default target
all: help

# Help target
help:
	@echo "COC-Vue Project Makefile"
	@echo "========================="
	@echo ""
	@echo "Available targets:"
	@echo "  make test              Run unit and integration tests"
	@echo "  make test-all          Run all tests (unit, integration, component, command, ping)"
	@echo "  make test-unit         Run unit tests only"
	@echo "  make test-integration  Run integration tests only"
	@echo "  make test-component    Run component tests only"
	@echo "  make test-command      Run command tests only"
	@echo "  make test-ping         Run ping tests only"
	@echo "  make clean             Clean up test ports and processes"
	@echo ""
	@echo "Options:"
	@echo "  VERBOSE=true           Enable verbose output"
	@echo "  TIMEOUT=300            Set test timeout in seconds (default: 300)"
	@echo ""
	@echo "Examples:"
	@echo "  make test VERBOSE=true"
	@echo "  make test-unit TIMEOUT=120"

# Main test target (unit + integration)
test:
	@echo "Running unit and integration tests..."
	@VERBOSE_LOGS=$(VERBOSE) MAX_TIMEOUT=$(TIMEOUT) $(TEST_DIR)/run-all-tests.sh

# Run all tests
test-all:
	@echo "Running all tests..."
	@VERBOSE_LOGS=$(VERBOSE) MAX_TIMEOUT=$(TIMEOUT) $(TEST_DIR)/run-all-tests.sh --all

# Run unit tests only
test-unit:
	@echo "Running unit tests..."
	@VERBOSE_LOGS=$(VERBOSE) MAX_TIMEOUT=$(TIMEOUT) $(TEST_DIR)/run-all-tests.sh --unit-only

# Run integration tests only
test-integration:
	@echo "Running integration tests..."
	@VERBOSE_LOGS=$(VERBOSE) MAX_TIMEOUT=$(TIMEOUT) $(TEST_DIR)/run-all-tests.sh --integration-only

# Run component tests only
test-component:
	@echo "Running component tests..."
	@VERBOSE_LOGS=$(VERBOSE) MAX_TIMEOUT=$(TIMEOUT) $(TEST_DIR)/run-all-tests.sh --component

# Run command tests only
test-command:
	@echo "Running command tests..."
	@VERBOSE_LOGS=$(VERBOSE) MAX_TIMEOUT=$(TIMEOUT) $(TEST_DIR)/run-all-tests.sh --command

# Run ping tests only
test-ping:
	@echo "Running ping tests..."
	@VERBOSE_LOGS=$(VERBOSE) MAX_TIMEOUT=$(TIMEOUT) $(TEST_DIR)/run-all-tests.sh --ping

# Clean up test ports and processes
clean:
	@echo "Cleaning up test ports and processes..."
	@$(TEST_DIR)/utils/cleanup-ports.sh
