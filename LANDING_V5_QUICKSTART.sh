#!/bin/bash
# Landing Page V5 "Ordem ao Caos" - Quick Start Script
# Este script configura o ambiente para começar a implementação

set -e  # Exit on error

echo "🚀 Landing Page V5 - Quick Start"
echo "================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Create branch
echo -e "${BLUE}[1/6]${NC} Creating feature branch..."
git checkout -b feature/landing-ordem-ao-caos 2>/dev/null || {
    echo -e "${YELLOW}Branch already exists, switching to it...${NC}"
    git checkout feature/landing-ordem-ao-caos
}
echo -e "${GREEN}✓ Branch created/switched${NC}"
echo ""

# Step 2: Create directory structure
echo -e "${BLUE}[2/6]${NC} Creating directory structure..."
mkdir -p src/modules/onboarding/components/landing-v5/{components/ModuleCards,services,types,hooks}
echo -e "${GREEN}✓ Directories created${NC}"
echo ""

# Step 3: Create base files
echo -e "${BLUE}[3/6]${NC} Creating base files..."

# Main component
cat > src/modules/onboarding/components/landing-v5/LandingPageV5.tsx << 'EOF'
import React from 'react';

/**
 * LandingPageV5 - "Ordem ao Caos"
 * TODO: Implement components from LANDING_PAGE_IMPLEMENTATION_GUIDE.md
 */
export function LandingPageV5() {
  return (
    <div className="min-h-screen bg-ceramic-base">
      <h1 className="text-6xl font-black text-center py-20">
        Ordem ao Caos
      </h1>
      {/* TODO: Add ChaosPanel and OrderPanel */}
    </div>
  );
}

export default LandingPageV5;
EOF

# Chaos Panel
cat > src/modules/onboarding/components/landing-v5/components/ChaosPanel.tsx << 'EOF'
import React from 'react';

/**
 * ChaosPanel - Left side visualization
 * TODO: Implement from LANDING_PAGE_IMPLEMENTATION_GUIDE.md Section 2.2
 */
export function ChaosPanel() {
  return (
    <div className="p-8">
      <h3 className="text-3xl font-black mb-4">🌪️ Caos</h3>
      {/* TODO: Add floating messages */}
    </div>
  );
}
EOF

# Order Panel
cat > src/modules/onboarding/components/landing-v5/components/OrderPanel.tsx << 'EOF'
import React from 'react';

/**
 * OrderPanel - Right side visualization
 * TODO: Implement from LANDING_PAGE_IMPLEMENTATION_GUIDE.md Section 2.3
 */
export function OrderPanel() {
  return (
    <div className="p-8">
      <h3 className="text-3xl font-black mb-4">✨ Ordem</h3>
      {/* TODO: Add module cards */}
    </div>
  );
}
EOF

# Processing Pipeline
cat > src/modules/onboarding/components/landing-v5/components/ProcessingPipeline.tsx << 'EOF'
import React from 'react';

/**
 * ProcessingPipeline - Visual pipeline
 * TODO: Implement from LANDING_PAGE_IMPLEMENTATION_GUIDE.md Section 2.4
 */
export function ProcessingPipeline() {
  return (
    <div className="p-8">
      <p>Pipeline de processamento...</p>
    </div>
  );
}
EOF

# Demo Processing Service
cat > src/modules/onboarding/components/landing-v5/services/demoProcessingService.ts << 'EOF'
/**
 * demoProcessingService
 * TODO: Implement from LANDING_PAGE_IMPLEMENTATION_GUIDE.md Section 2.5
 */

export const demoProcessingService = {
  generateDemoMessages() {
    // TODO: Implement
    return [];
  },

  async processMessages() {
    // TODO: Implement
  },

  classifyMessages() {
    // TODO: Implement
    return { atlas: [], journey: [], studio: [], connections: [] };
  }
};
EOF

# Types
cat > src/modules/onboarding/components/landing-v5/types/index.ts << 'EOF'
/**
 * Type definitions for Landing V5
 * TODO: Implement from LANDING_PAGE_IMPLEMENTATION_GUIDE.md Section 2.6
 */

export interface DemoMessage {
  id: string;
  text: string;
  timestamp: Date;
  sender: 'user' | 'contact';
  chaos_level: number;
}

export interface ProcessedModules {
  atlas: any[];
  journey: any[];
  studio: any[];
  connections: any[];
}
EOF

# Index (barrel export)
cat > src/modules/onboarding/components/landing-v5/index.ts << 'EOF'
export { LandingPageV5 } from './LandingPageV5';
export { ChaosPanel } from './components/ChaosPanel';
export { OrderPanel } from './components/OrderPanel';
export { ProcessingPipeline } from './components/ProcessingPipeline';
export { demoProcessingService } from './services/demoProcessingService';
EOF

echo -e "${GREEN}✓ Base files created${NC}"
echo ""

# Step 4: Show next steps
echo -e "${BLUE}[4/6]${NC} Opening documentation..."
echo ""
echo "📚 Key documentation files:"
echo "  1. docs/LANDING_PAGE_README.md - Start here!"
echo "  2. docs/LANDING_PAGE_IMPLEMENTATION_GUIDE.md - Code examples"
echo "  3. docs/LANDING_PAGE_VISUAL_WIREFRAMES.md - Design reference"
echo ""

# Step 5: Check dependencies
echo -e "${BLUE}[5/6]${NC} Checking dependencies..."
if command -v npm &> /dev/null; then
    echo -e "${GREEN}✓ npm found${NC}"
    echo "Checking if framer-motion is installed..."
    if npm list framer-motion &> /dev/null; then
        echo -e "${GREEN}✓ framer-motion already installed${NC}"
    else
        echo -e "${YELLOW}⚠ framer-motion not found. Installing...${NC}"
        npm install framer-motion
    fi
else
    echo -e "${YELLOW}⚠ npm not found${NC}"
fi
echo ""

# Step 6: Summary
echo -e "${BLUE}[6/6]${NC} Setup complete!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ Quick Start Setup Complete!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📂 Files created:"
echo "  ✓ src/modules/onboarding/components/landing-v5/"
echo "    ├── LandingPageV5.tsx"
echo "    ├── components/"
echo "    │   ├── ChaosPanel.tsx"
echo "    │   ├── OrderPanel.tsx"
echo "    │   └── ProcessingPipeline.tsx"
echo "    ├── services/"
echo "    │   └── demoProcessingService.ts"
echo "    ├── types/"
echo "    │   └── index.ts"
echo "    └── index.ts"
echo ""
echo "🎯 Next steps:"
echo "  1. Read: docs/LANDING_PAGE_README.md"
echo "  2. Implement: Follow docs/LANDING_PAGE_IMPLEMENTATION_GUIDE.md"
echo "  3. Reference: Check docs/LANDING_PAGE_VISUAL_WIREFRAMES.md"
echo ""
echo "💻 To start development:"
echo "  npm run dev"
echo ""
echo "🧪 To run tests:"
echo "  npm run test"
echo "  npm run test:e2e"
echo ""
echo "📊 Implementation checklist: docs/LANDING_PAGE_IMPLEMENTATION_GUIDE.md#12-checklist-de-implementação"
echo ""
echo -e "${BLUE}Happy coding! 🚀${NC}"
echo ""
