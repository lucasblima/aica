/**
 * Copyright (c) 2024 - Present. Aica Engineering. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Presentation Templates
 * Issue #117 - Presentation Generator
 *
 * Barrel export for CSS template imports.
 */

import './professional.css';
import './creative.css';
import './institutional.css';

export const TEMPLATE_STYLES = {
  professional: 'template-professional',
  creative: 'template-creative',
  institutional: 'template-institutional',
} as const;
