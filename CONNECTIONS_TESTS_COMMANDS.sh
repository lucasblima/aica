#!/bin/bash

# Connections E2E Tests - Quick Command Reference
# Usage: source CONNECTIONS_TESTS_COMMANDS.sh
# Then use: run_all_tests, run_habitat, etc.

echo "📋 Connection Archetypes E2E Tests - Command Shortcuts"
echo "======================================================"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ==================== RUN ALL TESTS ====================
run_all_tests() {
    echo -e "${BLUE}Running all connection tests...${NC}"
    npm run test:e2e tests/e2e/connections/
}

run_all_tests_headed() {
    echo -e "${BLUE}Running all connection tests (visible browser)...${NC}"
    npm run test:e2e:headed tests/e2e/connections/
}

# ==================== RUN BY FEATURE ====================
run_space_creation() {
    echo -e "${BLUE}Running space creation tests (53 tests)...${NC}"
    npm run test:e2e:headed tests/e2e/connections/space-creation.spec.ts
}

run_member_management() {
    echo -e "${BLUE}Running member management tests (30 tests)...${NC}"
    npm run test:e2e:headed tests/e2e/connections/member-management.spec.ts
}

# ==================== RUN BY ARCHETYPE ====================
run_habitat() {
    echo -e "${BLUE}Running Habitat tests (45 tests)...${NC}"
    npm run test:e2e:headed tests/e2e/connections/habitat.spec.ts
}

run_ventures() {
    echo -e "${BLUE}Running Ventures tests (40 tests)...${NC}"
    npm run test:e2e:headed tests/e2e/connections/ventures.spec.ts
}

run_academia() {
    echo -e "${BLUE}Running Academia tests (50 tests)...${NC}"
    npm run test:e2e:headed tests/e2e/connections/academia.spec.ts
}

run_tribo() {
    echo -e "${BLUE}Running Tribo tests (55 tests)...${NC}"
    npm run test:e2e:headed tests/e2e/connections/tribo.spec.ts
}

# ==================== DEBUG & INSPECT ====================
debug_test() {
    if [ -z "$1" ]; then
        echo -e "${YELLOW}Usage: debug_test space-creation${NC}"
        echo "Available: space-creation, member-management, habitat, ventures, academia, tribo"
        return 1
    fi
    
    echo -e "${BLUE}Opening debugger for $1...${NC}"
    npm run test:e2e:debug tests/e2e/connections/$1.spec.ts
}

inspect_ui() {
    echo -e "${BLUE}Opening Playwright Inspector...${NC}"
    npx playwright codegen http://localhost:3000/connections
}

# ==================== REPORTS ====================
show_report() {
    echo -e "${BLUE}Opening test report...${NC}"
    npx playwright show-report
}

# ==================== SINGLE TEST ====================
run_single_test() {
    if [ -z "$1" ] || [ -z "$2" ]; then
        echo -e "${YELLOW}Usage: run_single_test space-creation 'Test 1.1'${NC}"
        return 1
    fi
    
    echo -e "${BLUE}Running $2 from $1...${NC}"
    npm run test:e2e:headed tests/e2e/connections/$1.spec.ts -g "$2"
}

# ==================== HELP ====================
test_help() {
    cat << 'HELP'

📚 Available Commands:

FEATURE TESTS
  run_space_creation        - Create spaces (53 tests)
  run_member_management    - Member management (30 tests)

ARCHETYPE TESTS
  run_habitat              - Property management (45 tests)
  run_ventures             - Business management (40 tests)
  run_academia             - Knowledge management (50 tests)
  run_tribo                - Community management (55 tests)

ALL TESTS
  run_all_tests            - Run all tests (headless)
  run_all_tests_headed     - Run all tests (visible browser)

DEBUG
  debug_test <suite>       - Debug specific suite
  inspect_ui               - Open Playwright Inspector
  run_single_test <suite> <test>  - Run single test

REPORTS
  show_report              - View HTML test report

EXAMPLES
  run_habitat              - Test Habitat (property management)
  debug_test academia      - Debug Academia tests
  run_single_test space-creation "Test 1.1"

TIPS
  1. Start dev server: npm run dev
  2. Run tests: run_all_tests_headed
  3. Debug failures: debug_test space-creation
  4. View report: show_report

HELP
}

# ==================== STARTUP MESSAGE ====================
echo ""
echo -e "${GREEN}✅ Commands loaded!${NC}"
echo "Run ${YELLOW}test_help${NC} for available commands"
echo ""
