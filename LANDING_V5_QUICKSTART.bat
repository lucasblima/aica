@echo off
REM Landing Page V5 "Ordem ao Caos" - Quick Start Script (Windows)
REM Este script configura o ambiente para começar a implementação

echo.
echo ================================
echo Landing Page V5 - Quick Start
echo ================================
echo.

REM Step 1: Create branch
echo [1/6] Creating feature branch...
git checkout -b feature/landing-ordem-ao-caos 2>nul
if %errorlevel% neq 0 (
    echo Branch already exists, switching to it...
    git checkout feature/landing-ordem-ao-caos
)
echo [OK] Branch created/switched
echo.

REM Step 2: Create directory structure
echo [2/6] Creating directory structure...
mkdir src\modules\onboarding\components\landing-v5\components\ModuleCards 2>nul
mkdir src\modules\onboarding\components\landing-v5\services 2>nul
mkdir src\modules\onboarding\components\landing-v5\types 2>nul
mkdir src\modules\onboarding\components\landing-v5\hooks 2>nul
echo [OK] Directories created
echo.

REM Step 3: Create base files
echo [3/6] Creating base files...

REM Main component
(
echo import React from 'react';
echo.
echo /**
echo  * LandingPageV5 - "Ordem ao Caos"
echo  * TODO: Implement components from LANDING_PAGE_IMPLEMENTATION_GUIDE.md
echo  */
echo export function LandingPageV5^(^) {
echo   return ^(
echo     ^<div className="min-h-screen bg-ceramic-base"^>
echo       ^<h1 className="text-6xl font-black text-center py-20"^>
echo         Ordem ao Caos
echo       ^</h1^>
echo       {/* TODO: Add ChaosPanel and OrderPanel */}
echo     ^</div^>
echo   ^);
echo }
echo.
echo export default LandingPageV5;
) > src\modules\onboarding\components\landing-v5\LandingPageV5.tsx

REM Chaos Panel
(
echo import React from 'react';
echo.
echo /**
echo  * ChaosPanel - Left side visualization
echo  * TODO: Implement from LANDING_PAGE_IMPLEMENTATION_GUIDE.md Section 2.2
echo  */
echo export function ChaosPanel^(^) {
echo   return ^(
echo     ^<div className="p-8"^>
echo       ^<h3 className="text-3xl font-black mb-4"^>🌪️ Caos^</h3^>
echo       {/* TODO: Add floating messages */}
echo     ^</div^>
echo   ^);
echo }
) > src\modules\onboarding\components\landing-v5\components\ChaosPanel.tsx

REM Order Panel
(
echo import React from 'react';
echo.
echo /**
echo  * OrderPanel - Right side visualization
echo  * TODO: Implement from LANDING_PAGE_IMPLEMENTATION_GUIDE.md Section 2.3
echo  */
echo export function OrderPanel^(^) {
echo   return ^(
echo     ^<div className="p-8"^>
echo       ^<h3 className="text-3xl font-black mb-4"^>✨ Ordem^</h3^>
echo       {/* TODO: Add module cards */}
echo     ^</div^>
echo   ^);
echo }
) > src\modules\onboarding\components\landing-v5\components\OrderPanel.tsx

REM Processing Pipeline
(
echo import React from 'react';
echo.
echo /**
echo  * ProcessingPipeline - Visual pipeline
echo  * TODO: Implement from LANDING_PAGE_IMPLEMENTATION_GUIDE.md Section 2.4
echo  */
echo export function ProcessingPipeline^(^) {
echo   return ^(
echo     ^<div className="p-8"^>
echo       ^<p^>Pipeline de processamento...^</p^>
echo     ^</div^>
echo   ^);
echo }
) > src\modules\onboarding\components\landing-v5\components\ProcessingPipeline.tsx

REM Demo Processing Service
(
echo /**
echo  * demoProcessingService
echo  * TODO: Implement from LANDING_PAGE_IMPLEMENTATION_GUIDE.md Section 2.5
echo  */
echo.
echo export const demoProcessingService = {
echo   generateDemoMessages^(^) {
echo     // TODO: Implement
echo     return [];
echo   },
echo.
echo   async processMessages^(^) {
echo     // TODO: Implement
echo   },
echo.
echo   classifyMessages^(^) {
echo     // TODO: Implement
echo     return { atlas: [], journey: [], studio: [], connections: [] };
echo   }
echo };
) > src\modules\onboarding\components\landing-v5\services\demoProcessingService.ts

REM Types
(
echo /**
echo  * Type definitions for Landing V5
echo  * TODO: Implement from LANDING_PAGE_IMPLEMENTATION_GUIDE.md Section 2.6
echo  */
echo.
echo export interface DemoMessage {
echo   id: string;
echo   text: string;
echo   timestamp: Date;
echo   sender: 'user' ^| 'contact';
echo   chaos_level: number;
echo }
echo.
echo export interface ProcessedModules {
echo   atlas: any[];
echo   journey: any[];
echo   studio: any[];
echo   connections: any[];
echo }
) > src\modules\onboarding\components\landing-v5\types\index.ts

REM Index barrel export
(
echo export { LandingPageV5 } from './LandingPageV5';
echo export { ChaosPanel } from './components/ChaosPanel';
echo export { OrderPanel } from './components/OrderPanel';
echo export { ProcessingPipeline } from './components/ProcessingPipeline';
echo export { demoProcessingService } from './services/demoProcessingService';
) > src\modules\onboarding\components\landing-v5\index.ts

echo [OK] Base files created
echo.

REM Step 4: Documentation
echo [4/6] Documentation ready...
echo.
echo Key documentation files:
echo   1. docs\LANDING_PAGE_README.md - Start here!
echo   2. docs\LANDING_PAGE_IMPLEMENTATION_GUIDE.md - Code examples
echo   3. docs\LANDING_PAGE_VISUAL_WIREFRAMES.md - Design reference
echo.

REM Step 5: Check dependencies
echo [5/6] Checking dependencies...
where npm >nul 2>nul
if %errorlevel% equ 0 (
    echo [OK] npm found
    echo Checking if framer-motion is installed...
    npm list framer-motion >nul 2>nul
    if %errorlevel% neq 0 (
        echo [WARNING] framer-motion not found. Installing...
        npm install framer-motion
    ) else (
        echo [OK] framer-motion already installed
    )
) else (
    echo [WARNING] npm not found
)
echo.

REM Step 6: Summary
echo [6/6] Setup complete!
echo.
echo ================================================
echo            Setup Complete!
echo ================================================
echo.
echo Files created:
echo   + src\modules\onboarding\components\landing-v5\
echo     - LandingPageV5.tsx
echo     - components\
echo       - ChaosPanel.tsx
echo       - OrderPanel.tsx
echo       - ProcessingPipeline.tsx
echo     - services\
echo       - demoProcessingService.ts
echo     - types\
echo       - index.ts
echo     - index.ts
echo.
echo Next steps:
echo   1. Read: docs\LANDING_PAGE_README.md
echo   2. Implement: Follow docs\LANDING_PAGE_IMPLEMENTATION_GUIDE.md
echo   3. Reference: Check docs\LANDING_PAGE_VISUAL_WIREFRAMES.md
echo.
echo To start development:
echo   npm run dev
echo.
echo To run tests:
echo   npm run test
echo   npm run test:e2e
echo.
echo Happy coding!
echo.
pause
