/**
 * Unit Tests for Journey Validator Service
 *
 * Tests cover:
 * - Blocking detection (missing required fields)
 * - Progress calculation (0-100%)
 * - Field validation (type checking, rules)
 * - Utility methods (sanitize, merge, etc.)
 *
 * Run with: npm test journeyValidator.test.ts
 *
 * @see src/services/journeyValidator.ts
 */

import { journeyValidator, JourneyValidator } from '../journeyValidator';
import { getJourneySchema } from '../../data/journeySchemas';
import type { JourneySchema } from '../../types/journeySchemas';

describe('JourneyValidator', () => {
  let financeSchema: JourneySchema;
  let emotionalHealthSchema: JourneySchema;

  beforeAll(() => {
    financeSchema = getJourneySchema('finance') as JourneySchema;
    emotionalHealthSchema = getJourneySchema('health-emotional') as JourneySchema;
  });

  describe('Blocking Detection', () => {
    it('should detect blocked journey when required field is missing', () => {
      const userData = {
        // Missing financial_status (REQUIRED)
        monthly_income: 3000,
        financial_priorities: ['debt'],
      };

      const result = journeyValidator.validateJourneyContext(financeSchema, userData);

      expect(result.isBlocked).toBe(true);
      expect(result.missingFields.length).toBeGreaterThan(0);
      expect(result.missingFields.some(f => f.key === 'financial_status')).toBe(true);
    });

    it('should NOT block when all required fields are filled', () => {
      const userData = {
        financial_status: 'stressed',
        monthly_income: 3000,
        financial_priorities: ['debt', 'emergency'],
      };

      const result = journeyValidator.validateJourneyContext(financeSchema, userData);

      expect(result.isBlocked).toBe(false);
      expect(result.missingFields.length).toBe(0);
    });

    it('should block when ALL required fields are missing', () => {
      const userData = {};

      const result = journeyValidator.validateJourneyContext(financeSchema, userData);

      expect(result.isBlocked).toBe(true);
      expect(result.missingFields.length).toBe(financeSchema.requiredFieldsCount);
    });

    it('should allow null/empty for optional fields', () => {
      const userData = {
        financial_status: 'secure',
        monthly_income: 5000,
        financial_priorities: ['invest'],
        // Optional fields left empty
        total_debts: null,
        monthly_expenses: undefined,
        has_emergency_fund: '',
      };

      const result = journeyValidator.validateJourneyContext(financeSchema, userData);

      expect(result.isBlocked).toBe(false);
    });
  });

  describe('Progress Calculation', () => {
    it('should calculate 0% when no fields are filled', () => {
      const userData = {};

      const result = journeyValidator.getCompletionPercentage(financeSchema, userData);

      expect(result).toBe(0);
    });

    it('should calculate correct percentage with partial fields', () => {
      const userData = {
        financial_status: 'stressed',
        // Total: 1 of 8 fields = 12.5%
      };

      const result = journeyValidator.getCompletionPercentage(financeSchema, userData);

      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThan(100);
    });

    it('should calculate 100% when all fields are filled', () => {
      const userData = {
        financial_status: 'stressed',
        financial_priorities: ['debt'],
        monthly_income: 3000,
        total_debts: 15000,
        monthly_expenses: 2000,
        has_emergency_fund: false,
        emergency_fund_amount: null,
        tracks_expenses: 'yes_basic',
      };

      const result = journeyValidator.getCompletionPercentage(financeSchema, userData);

      expect(result).toBe(100);
    });

    it('should round to nearest integer', () => {
      const userData = {
        financial_status: 'stressed',
        monthly_income: 3000,
        // 3 out of 8 = 37.5%, should round to 38
      };

      const result = journeyValidator.getCompletionPercentage(financeSchema, userData);

      expect(Number.isInteger(result)).toBe(true);
    });
  });

  describe('Field Validation', () => {
    describe('Type Validation', () => {
      it('should validate number type', () => {
        const userData = {
          financial_status: 'stressed',
          financial_priorities: ['debt'],
          monthly_income: 'not a number', // INVALID
        };

        const result = journeyValidator.validateJourneyContext(financeSchema, userData);

        expect(result.isValid).toBe(false);
        const incomeResult = result.fieldResults.find(f => f.fieldKey === 'monthly_income');
        expect(incomeResult?.isValid).toBe(false);
      });

      it('should validate currency (decimal) type', () => {
        const userData = {
          monthly_income: '3000.50',
          total_debts: 'invalid', // INVALID
        };

        const result = journeyValidator.validateJourneyContext(financeSchema, userData);

        const debtsResult = result.fieldResults.find(f => f.fieldKey === 'total_debts');
        expect(debtsResult?.isValid).toBe(false);
      });

      it('should validate array type', () => {
        const userData = {
          financial_priorities: 'debt', // Should be array
        };

        const result = journeyValidator.validateJourneyContext(financeSchema, userData);

        const prioritiesResult = result.fieldResults.find(f => f.fieldKey === 'financial_priorities');
        expect(prioritiesResult?.isValid).toBe(false);
      });
    });

    describe('Custom Validation Rules', () => {
      it('should apply min/max rules', () => {
        const userData = {
          monthly_income: -1000, // Should be >= 0
        };

        const result = journeyValidator.validateJourneyContext(financeSchema, userData);

        const incomeResult = result.fieldResults.find(f => f.fieldKey === 'monthly_income');
        expect(incomeResult?.errors.length).toBeGreaterThan(0);
      });

      it('should validate range boundaries', () => {
        const userData = {
          financial_status: 'stressed',
          financial_priorities: ['debt'],
          monthly_income: 999999999999, // Very large but valid

          // Valid sleep hours
          sleep_hours_per_night: 8,
        };

        const result = journeyValidator.validateJourneyContext(emotionalHealthSchema, userData);

        // Should pass basic validation (though large number)
        expect(result.fieldResults.some(f => f.fieldKey === 'monthly_income')).toBe(true);
      });
    });

    describe('Field Result Details', () => {
      it('should return correct field result structure', () => {
        const userData = {
          financial_status: 'stressed',
        };

        const result = journeyValidator.validateJourneyContext(financeSchema, userData);

        const fieldResult = result.fieldResults.find(f => f.fieldKey === 'financial_status');

        expect(fieldResult).toMatchObject({
          fieldKey: 'financial_status',
          isValid: true,
          isFilled: true,
          isRequired: true,
          value: 'stressed',
        });
      });

      it('should include error messages in field results', () => {
        const userData = {
          monthly_income: 'invalid',
        };

        const result = journeyValidator.validateJourneyContext(financeSchema, userData);

        const incomeResult = result.fieldResults.find(f => f.fieldKey === 'monthly_income');

        expect(incomeResult?.errors).toBeDefined();
        expect(incomeResult?.errors.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Utility Methods', () => {
    describe('getMissingFields', () => {
      it('should return only required missing fields', () => {
        const userData = {
          financial_status: 'stressed',
          // Missing: financial_priorities, monthly_income
        };

        const missing = journeyValidator.getMissingFields(financeSchema, userData);

        expect(missing.length).toBeGreaterThan(0);
        expect(missing.every(f => f.required)).toBe(true);
      });

      it('should not include optional missing fields', () => {
        const userData = {
          financial_status: 'stressed',
          financial_priorities: ['debt'],
          monthly_income: 3000,
          // optional: total_debts, monthly_expenses, etc are missing
        };

        const missing = journeyValidator.getMissingFields(financeSchema, userData);

        expect(missing.length).toBe(0); // All required filled
      });
    });

    describe('getNextRequiredField', () => {
      it('should return first missing required field', () => {
        const userData = {
          // Missing financial_status, financial_priorities, monthly_income
        };

        const next = journeyValidator.getNextRequiredField(financeSchema, userData);

        expect(next).not.toBeNull();
        expect(next?.required).toBe(true);
        // Should be first field in schema
        expect(next?.key).toBe('financial_status');
      });

      it('should return null when all required fields filled', () => {
        const userData = {
          financial_status: 'stressed',
          financial_priorities: ['debt'],
          monthly_income: 3000,
        };

        const next = journeyValidator.getNextRequiredField(financeSchema, userData);

        expect(next).toBeNull();
      });
    });

    describe('isFieldValid', () => {
      it('should return true for valid field', () => {
        const userData = {
          financial_status: 'stressed',
        };

        const isValid = journeyValidator.isFieldValid(financeSchema, userData, 'financial_status');

        expect(isValid).toBe(true);
      });

      it('should return false for invalid field', () => {
        const userData = {
          monthly_income: 'not a number',
        };

        const isValid = journeyValidator.isFieldValid(financeSchema, userData, 'monthly_income');

        expect(isValid).toBe(false);
      });

      it('should return false for missing required field', () => {
        const userData = {};

        const isValid = journeyValidator.isFieldValid(financeSchema, userData, 'financial_status');

        expect(isValid).toBe(false);
      });

      it('should return true for missing optional field', () => {
        const userData = {
          financial_status: 'stressed',
          financial_priorities: ['debt'],
          monthly_income: 3000,
        };

        const isValid = journeyValidator.isFieldValid(financeSchema, userData, 'total_debts');

        // Optional missing field is considered valid
        expect(isValid).toBe(true);
      });
    });

    describe('sanitizeData', () => {
      it('should remove unknown fields', () => {
        const userData = {
          financial_status: 'stressed',
          unknown_field: 'should be removed',
          another_bad_field: 123,
        };

        const clean = journeyValidator.sanitizeData(financeSchema, userData);

        expect(clean.financial_status).toBe('stressed');
        expect(clean.unknown_field).toBeUndefined();
        expect(clean.another_bad_field).toBeUndefined();
      });

      it('should keep only schema-defined fields', () => {
        const userData = {
          financial_status: 'stressed',
          financial_priorities: ['debt'],
          monthly_income: 3000,
          total_debts: 15000,
          monthly_expenses: 2000,
          has_emergency_fund: true,
          emergency_fund_amount: 5000,
          tracks_expenses: 'yes_basic',
          malicious_field: 'remove me',
          another_bad: 'also remove',
        };

        const clean = journeyValidator.sanitizeData(financeSchema, userData);

        // Should have all valid fields
        expect(Object.keys(clean).length).toBeLessThan(Object.keys(userData).length);

        // Should not have malicious fields
        expect(clean.malicious_field).toBeUndefined();
        expect(clean.another_bad).toBeUndefined();

        // Should have all valid fields
        expect(clean.financial_status).toBeDefined();
        expect(clean.monthly_income).toBeDefined();
      });
    });

    describe('mergeContext', () => {
      it('should merge new data with existing', () => {
        const existing = {
          financial_status: 'stressed',
          monthly_income: 3000,
        };

        const newData = {
          financial_priorities: ['debt'],
          total_debts: 15000,
        };

        const merged = journeyValidator.mergeContext(financeSchema, existing, newData);

        expect(merged.financial_status).toBe('stressed');
        expect(merged.monthly_income).toBe(3000);
        expect(merged.financial_priorities).toEqual(['debt']);
        expect(merged.total_debts).toBe(15000);
      });

      it('should overwrite with new values', () => {
        const existing = {
          financial_status: 'stressed',
          monthly_income: 3000,
        };

        const newData = {
          financial_status: 'secure', // Changed
          monthly_income: 5000, // Changed
        };

        const merged = journeyValidator.mergeContext(financeSchema, existing, newData);

        expect(merged.financial_status).toBe('secure');
        expect(merged.monthly_income).toBe(5000);
      });

      it('should only merge schema-defined fields', () => {
        const existing = {
          financial_status: 'stressed',
        };

        const newData = {
          financial_status: 'secure',
          malicious_field: 'remove me',
        };

        const merged = journeyValidator.mergeContext(financeSchema, existing, newData);

        expect(merged.financial_status).toBe('secure');
        expect(merged.malicious_field).toBeUndefined();
      });
    });

    describe('getValidationSummary', () => {
      it('should return success message when valid', () => {
        const userData = {
          financial_status: 'stressed',
          financial_priorities: ['debt'],
          monthly_income: 3000,
        };

        const summary = journeyValidator.getValidationSummary(financeSchema, userData);

        expect(summary).toContain('completo');
        expect(summary).toContain('%');
      });

      it('should return blocking message when blocked', () => {
        const userData = {
          financial_status: 'stressed',
          // Missing other required fields
        };

        const summary = journeyValidator.getValidationSummary(financeSchema, userData);

        expect(summary).toContain('Faltam campos');
      });
    });

    describe('getProgressMessage', () => {
      it('should return 0% message', () => {
        const userData = {};

        const msg = journeyValidator.getProgressMessage(financeSchema, userData);

        expect(msg).toContain('Comece');
      });

      it('should return progress messages at different percentages', () => {
        const userData1 = { financial_status: 'stressed' };
        const msg1 = journeyValidator.getProgressMessage(financeSchema, userData1);
        expect(msg1).toContain('começo');

        const userData2 = {
          financial_status: 'stressed',
          financial_priorities: ['debt'],
          monthly_income: 3000,
          total_debts: 15000,
        };
        const msg2 = journeyValidator.getProgressMessage(financeSchema, userData2);
        expect(msg2).toContain('bom');
      });

      it('should return complete message', () => {
        const userData = {
          financial_status: 'stressed',
          financial_priorities: ['debt'],
          monthly_income: 3000,
          total_debts: 15000,
          monthly_expenses: 2000,
          has_emergency_fund: true,
          emergency_fund_amount: 5000,
          tracks_expenses: 'yes_basic',
        };

        const msg = journeyValidator.getProgressMessage(financeSchema, userData);

        expect(msg).toContain('completo');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty object', () => {
      const result = journeyValidator.validateJourneyContext(financeSchema, {});

      expect(result.isBlocked).toBe(true);
      expect(result.completionPercentage).toBe(0);
    });

    it('should handle null/undefined data gracefully', () => {
      const result = journeyValidator.validateJourneyContext(financeSchema, null as any);

      expect(result).toBeDefined();
      expect(result.isBlocked).toBe(true);
    });

    it('should handle zero as valid value', () => {
      const userData = {
        monthly_income: 0,
      };

      const result = journeyValidator.validateJourneyContext(financeSchema, userData);

      // Zero should be valid (unemployment is possible)
      const incomeResult = result.fieldResults.find(f => f.fieldKey === 'monthly_income');
      expect(incomeResult?.isFilled).toBe(true);
      expect(incomeResult?.isValid).toBe(true);
    });

    it('should handle false as valid boolean value', () => {
      const userData = {
        has_emergency_fund: false,
      };

      const result = journeyValidator.validateJourneyContext(financeSchema, userData);

      const fundResult = result.fieldResults.find(f => f.fieldKey === 'has_emergency_fund');
      expect(fundResult?.isFilled).toBe(true);
    });

    it('should handle empty array as valid array value', () => {
      const userData = {
        financial_priorities: [],
      };

      // Empty array should be treated as filled (user explicitly chose nothing)
      // But validation might require at least one item - depends on rules
      const result = journeyValidator.validateJourneyContext(financeSchema, userData);

      const prioritiesResult = result.fieldResults.find(f => f.fieldKey === 'financial_priorities');
      expect(prioritiesResult?.isFilled).toBe(true);
    });
  });

  describe('Different Schemas', () => {
    it('should work with emotional health schema', () => {
      const userData = {
        current_emotional_state: 'anxious',
        emotional_focus_areas: ['stress_management'],
        reflection_frequency: 'daily',
        primary_emotional_goal: 'reduce_stress',
      };

      const result = journeyValidator.validateJourneyContext(emotionalHealthSchema, userData);

      expect(result.isBlocked).toBe(false);
      expect(result.completionPercentage).toBeGreaterThan(0);
    });

    it('should validate different field types per schema', () => {
      // Finance uses decimals for currency
      const financeData = { monthly_income: 3000.50 };
      const financeResult = journeyValidator.validateJourneyContext(financeSchema, financeData);

      const incomeResult = financeResult.fieldResults.find(f => f.fieldKey === 'monthly_income');
      expect(incomeResult?.isValid).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should validate quickly', () => {
      const userData = {
        financial_status: 'stressed',
        financial_priorities: ['debt'],
        monthly_income: 3000,
      };

      const start = performance.now();
      journeyValidator.validateJourneyContext(financeSchema, userData);
      const end = performance.now();

      const duration = end - start;
      expect(duration).toBeLessThan(10); // Should be < 10ms
    });

    it('should handle large context data efficiently', () => {
      const userData: Record<string, any> = {};

      // Fill with many fields
      for (let i = 0; i < 1000; i++) {
        userData[`field_${i}`] = `value_${i}`;
      }

      // Add actual fields
      userData.financial_status = 'stressed';
      userData.financial_priorities = ['debt'];
      userData.monthly_income = 3000;

      const start = performance.now();
      const result = journeyValidator.validateJourneyContext(financeSchema, userData);
      const end = performance.now();

      const duration = end - start;
      expect(duration).toBeLessThan(50); // Should still be fast
      expect(result.isBlocked).toBe(false);
    });
  });
});
