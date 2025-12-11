/**
 * Test Users Fixture
 * Provides reusable test user data and utilities for onboarding tests
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * Generate unique test email
 */
export function generateTestEmail(prefix: string = 'e2etest'): string {
  const uniquePart = uuidv4().substring(0, 8);
  return `${prefix}-${uniquePart}@aica.test`;
}

/**
 * Standard test user for onboarding
 */
export const TEST_USERS = {
  // Basic user for happy path testing
  ONBOARDING_USER: {
    email: process.env.TEST_EMAIL || 'onboarding@aica.test',
    password: process.env.TEST_PASSWORD || 'SecureTest123!@#',
    name: 'Onboarding Test User',
  },

  // User for sign up testing
  NEW_USER: {
    email: generateTestEmail('newuser'),
    password: 'NewPassword123!@#',
    name: 'New User Test',
  },

  // User for duplicate email testing
  DUPLICATE_TEST: {
    email: generateTestEmail('duplicate'),
    password: 'DuplicatePassword123!@#',
  },

  // User for weak password testing
  WEAK_PASSWORD_USER: {
    email: generateTestEmail('weakpass'),
    password: '123456', // Too weak
  },

  // User for invalid email testing
  INVALID_EMAIL_USER: {
    email: 'not-an-email',
    password: 'ValidPassword123!@#',
  },
};

/**
 * Standard test passwords
 */
export const TEST_PASSWORDS = {
  STRONG: 'SuperSecure123!@#',
  MEDIUM: 'Medium123!',
  WEAK: '123456',
  TOO_SHORT: 'abc',
  NO_SPECIAL_CHARS: 'NoSpecial123',
  NO_NUMBERS: 'NoNumbers!@#',
  NO_UPPERCASE: 'nouppercase123!@#',
  NO_LOWERCASE: 'NOLOWERCASE123!@#',
};

/**
 * Generate a new unique test user
 */
export function generateNewTestUser(prefix: string = 'e2etest') {
  return {
    email: generateTestEmail(prefix),
    password: 'TestPassword123!@#',
    name: `Test User ${Date.now()}`,
  };
}

/**
 * Validate test user data
 */
export function validateUserData(user: {
  email?: string;
  password?: string;
  name?: string;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!user.email) {
    errors.push('Email is required');
  } else if (!user.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
    errors.push('Email format is invalid');
  }

  if (!user.password) {
    errors.push('Password is required');
  } else if (user.password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
