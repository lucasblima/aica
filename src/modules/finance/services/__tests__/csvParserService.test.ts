/**
 * CSV Parser Service Tests
 *
 * Validates delimiter-aware format detection and transaction parsing.
 * Specifically tests fix for issue #749: comma-delimited CSVs with
 * Portuguese column names (Data,Valor) incorrectly matching Banco Inter
 * format (which expects semicolons).
 *
 * Run with:
 *   npx vitest run src/modules/finance/services/__tests__/csvParserService.test.ts
 */

import { describe, it, expect, vi } from 'vitest';
import { CSVParserService } from '../csvParserService';

// Mock the logger to avoid noise in test output
vi.mock('@/lib/logger', () => ({
  createNamespacedLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

/**
 * Helper: create a File object from CSV string content
 */
function createCSVFile(content: string, filename = 'test.csv'): File {
  const blob = new Blob([content], { type: 'text/csv' });
  return new File([blob], filename, { type: 'text/csv' });
}

describe('CSVParserService', () => {
  const service = new CSVParserService();

  describe('Comma-delimited CSV with Portuguese columns (Issue #749)', () => {
    it('should use generic format for Data,Valor,Identificador,Descrição (comma-delimited, no Saldo)', async () => {
      const csv = [
        'Data,Valor,Identificador,Descri\u00E7\u00E3o',
        '01/03/2026,-150.00,TXN001,Supermercado Extra',
        '02/03/2026,3500.00,TXN002,Sal\u00E1rio',
      ].join('\n');

      const file = createCSVFile(csv);
      const result = await service.parseCSV(file);

      // Should NOT match Banco Inter (which uses semicolons)
      expect(result.bankName).not.toBe('Banco Inter');
      // Should use the generic fallback format
      expect(result.bankName).toBe('Gen\u00E9rico');
      // Should parse both transactions
      expect(result.transactions).toHaveLength(2);
      // Verify transaction data
      expect(result.transactions[0].description).toBe('Supermercado Extra');
      expect(result.transactions[0].amount).toBe(150.00);
      expect(result.transactions[0].type).toBe('expense');
      expect(result.transactions[1].amount).toBe(3500.00);
      expect(result.transactions[1].type).toBe('income');
    });
  });

  describe('Semicolon-delimited CSV with Brazilian date format', () => {
    it('should use generic format for semicolon CSV without matching a known bank', async () => {
      const csv = [
        'Data;Descrição;Valor;Categoria',
        '15/02/2026;Restaurante;-89,90;Alimentacao',
        '16/02/2026;Freelance;200,00;Renda',
      ].join('\n');

      const file = createCSVFile(csv);
      const result = await service.parseCSV(file);

      // No known bank has these exact columns (Descrição without cedilla), so generic format
      expect(result.bankName).toBe('Gen\u00E9rico');
      expect(result.transactions).toHaveLength(2);
      expect(result.transactions[0].description).toBe('Restaurante');
      expect(result.transactions[0].amount).toBe(89.90);
      expect(result.transactions[0].type).toBe('expense');
      expect(result.transactions[1].description).toBe('Freelance');
      expect(result.transactions[1].amount).toBe(200.00);
      expect(result.transactions[1].type).toBe('income');
    });
  });

  describe('Nubank format detection', () => {
    it('should correctly detect Nubank CSV (date,title,amount)', async () => {
      const csv = [
        'date,title,amount',
        '2026-03-01,Uber *Trip,-25.50',
        '2026-03-02,Pix Recebido,100.00',
      ].join('\n');

      const file = createCSVFile(csv);
      const result = await service.parseCSV(file);

      expect(result.bankName).toBe('Nubank');
      expect(result.sourceFormat).toBe('nubank_csv');
      expect(result.transactions).toHaveLength(2);
      expect(result.transactions[0].description).toBe('Uber *Trip');
      expect(result.transactions[0].amount).toBe(25.50);
      expect(result.transactions[0].type).toBe('expense');
      expect(result.transactions[1].amount).toBe(100.00);
      expect(result.transactions[1].type).toBe('income');
    });
  });

  describe('Banco Inter format detection', () => {
    it('should correctly detect Inter CSV (Data;Descri\u00E7\u00E3o;Valor;Saldo)', async () => {
      const csv = [
        'Data;Descri\u00E7\u00E3o;Valor;Saldo',
        '10/03/2026;Pagamento Boleto;-350,00;1200,00',
        '11/03/2026;Pix Recebido;500,00;1700,00',
      ].join('\n');

      const file = createCSVFile(csv);
      const result = await service.parseCSV(file);

      expect(result.bankName).toBe('Banco Inter');
      expect(result.sourceFormat).toBe('banco_inter_csv');
      expect(result.transactions).toHaveLength(2);
      expect(result.transactions[0].description).toBe('Pagamento Boleto');
      expect(result.transactions[0].amount).toBe(350.00);
      expect(result.transactions[0].type).toBe('expense');
      expect(result.transactions[0].balance).toBe(1200.00);
      expect(result.transactions[1].amount).toBe(500.00);
      expect(result.transactions[1].type).toBe('income');
      expect(result.transactions[1].balance).toBe(1700.00);
    });
  });

  describe('Edge cases', () => {
    it('should throw on empty CSV', async () => {
      const file = createCSVFile('');
      await expect(service.parseCSV(file)).rejects.toThrow();
    });

    it('should throw on CSV with unrecognized columns', async () => {
      const csv = 'Foo,Bar,Baz\n1,2,3';
      const file = createCSVFile(csv);
      await expect(service.parseCSV(file)).rejects.toThrow('Formato de CSV n\u00E3o reconhecido');
    });
  });
});
