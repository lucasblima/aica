#!/bin/bash

# Aica Life OS - Onboarding E2E Test Runner
# Convenient script to run onboarding tests with different configurations

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored messages
print_info() {
  echo -e "${BLUE}INFO:${NC} $1"
}

print_success() {
  echo -e "${GREEN}SUCCESS:${NC} $1"
}

print_error() {
  echo -e "${RED}ERROR:${NC} $1"
}

print_warning() {
  echo -e "${YELLOW}WARNING:${NC} $1"
}

# Display usage information
usage() {
  cat << EOF
Usage: ./run-onboarding-tests.sh [OPTION]

Options:
  run                Run all onboarding tests (default)
  ui                 Run tests in interactive UI mode
  debug              Run tests in debug mode (with step-through)
  headed             Run tests in headed mode (visible browser)
  landing            Run only landing page tests
  signup             Run only sign up tests
  tour               Run only welcome tour tests
  trails             Run only trail selection tests
  moment             Run only moment capture tests
  recommendations    Run only recommendations tests
  accessibility      Run only accessibility tests
  integration        Run only integration tests
  error              Run only error handling tests
  persistence        Run only data persistence tests
  report             Show HTML test report
  help               Display this help message

Examples:
  ./run-onboarding-tests.sh run          # Run all tests
  ./run-onboarding-tests.sh ui           # Interactive UI mode
  ./run-onboarding-tests.sh landing      # Only landing page tests
  ./run-onboarding-tests.sh debug        # Debug mode
EOF
}

# Parse command line arguments
COMMAND=${1:-run}

case "$COMMAND" in
  run)
    print_info "Running all onboarding tests..."
    npx playwright test onboarding.spec.ts
    print_success "All tests completed!"
    ;;
  ui)
    print_info "Starting Playwright UI mode..."
    npx playwright test onboarding.spec.ts --ui
    ;;
  debug)
    print_info "Starting debug mode with step-through..."
    npx playwright test onboarding.spec.ts --debug
    ;;
  headed)
    print_info "Running tests in headed mode (visible browser)..."
    npx playwright test onboarding.spec.ts --headed
    ;;
  landing)
    print_info "Running landing page tests..."
    npx playwright test onboarding.spec.ts -g "Section 1: Landing Page"
    ;;
  signup)
    print_info "Running sign up tests..."
    npx playwright test onboarding.spec.ts -g "Section 2: Sign Up"
    ;;
  tour)
    print_info "Running welcome tour tests..."
    npx playwright test onboarding.spec.ts -g "Section 3: Welcome Tour"
    ;;
  trails)
    print_info "Running trail selection tests..."
    npx playwright test onboarding.spec.ts -g "Section 4: Trail Selection"
    ;;
  moment)
    print_info "Running moment capture tests..."
    npx playwright test onboarding.spec.ts -g "Section 5: Moment Capture"
    ;;
  recommendations)
    print_info "Running recommendations tests..."
    npx playwright test onboarding.spec.ts -g "Section 6: Recommendations"
    ;;
  accessibility)
    print_info "Running accessibility tests..."
    npx playwright test onboarding.spec.ts -g "Section 7: Accessibility"
    ;;
  integration)
    print_info "Running integration tests..."
    npx playwright test onboarding.spec.ts -g "Section 8: Integration"
    ;;
  error)
    print_info "Running error handling tests..."
    npx playwright test onboarding.spec.ts -g "Section 9: Error Handling"
    ;;
  persistence)
    print_info "Running data persistence tests..."
    npx playwright test onboarding.spec.ts -g "Section 10: Data Persistence"
    ;;
  report)
    print_info "Opening HTML test report..."
    npx playwright show-report
    ;;
  help)
    usage
    ;;
  *)
    print_error "Unknown command: $COMMAND"
    usage
    exit 1
    ;;
esac
