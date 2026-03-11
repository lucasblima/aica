import { supabase } from '@/services/supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';
import type { FinanceTransaction } from '../types';

const log = createNamespacedLogger('ExportService');

/**
 * Fetch transactions for export within a date range.
 */
export async function getExportData(
  userId: string,
  dateRange: { start: string; end: string }
): Promise<FinanceTransaction[]> {
  try {
    const { data, error } = await supabase
      .from('finance_transactions')
      .select('*')
      .eq('user_id', userId)
      .gte('transaction_date', dateRange.start)
      .lte('transaction_date', dateRange.end)
      .order('transaction_date', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    log.error('Error fetching export data:', error);
    throw error;
  }
}

/**
 * Generate a CSV string from transactions and trigger a browser download.
 */
export function exportToCSV(
  transactions: FinanceTransaction[],
  filename: string = 'transacoes.csv'
): void {
  const MAX_EXPORT_ROWS = 50000;
  let txToExport = transactions;
  if (txToExport.length > MAX_EXPORT_ROWS) {
    log.warn(`[Export] ${txToExport.length} rows exceeds limit, truncating to ${MAX_EXPORT_ROWS}`);
    txToExport = txToExport.slice(0, MAX_EXPORT_ROWS);
  }

  const headers = [
    'Data',
    'Descricao',
    'Valor',
    'Tipo',
    'Categoria',
    'Recorrente',
  ];

  const rows = txToExport.map((tx) => [
    tx.transaction_date,
    `"${(tx.description || '').replace(/"/g, '""')}"`,
    Number(tx.amount).toFixed(2),
    tx.type === 'income' ? 'Receita' : 'Despesa',
    tx.category,
    tx.is_recurring ? 'Sim' : 'Nao',
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join(
    '\n'
  );

  triggerDownload(csvContent, filename, 'text/csv;charset=utf-8;');
}

/**
 * Generate a printable HTML view and open the browser print dialog.
 */
export function exportToPDF(
  transactions: FinanceTransaction[],
  summary: { totalIncome: number; totalExpenses: number; balance: number },
  filename: string = 'transacoes'
): void {
  const totalIncome = formatCurrency(summary.totalIncome);
  const totalExpenses = formatCurrency(summary.totalExpenses);
  const balance = formatCurrency(summary.balance);

  const tableRows = transactions
    .map(
      (tx) => `
    <tr>
      <td>${tx.transaction_date}</td>
      <td>${escapeHtml(tx.description)}</td>
      <td style="color:${tx.type === 'income' ? '#16a34a' : '#dc2626'}">
        ${tx.type === 'income' ? '+' : '-'} R$ ${Math.abs(Number(tx.amount)).toFixed(2)}
      </td>
      <td>${tx.category}</td>
    </tr>`
    )
    .join('');

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(filename)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 24px; color: #1f2937; }
    h1 { font-size: 20px; margin-bottom: 8px; }
    .summary { display: flex; gap: 24px; margin-bottom: 16px; }
    .summary div { padding: 8px 16px; border-radius: 8px; background: #f3f4f6; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { text-align: left; padding: 6px 10px; border-bottom: 1px solid #e5e7eb; }
    th { background: #f9fafb; font-weight: 600; }
    @media print { .no-print { display: none; } }
  </style>
</head>
<body>
  <h1>AICA Finance - Relatorio de Transacoes</h1>
  <div class="summary">
    <div>Receitas: <strong>${totalIncome}</strong></div>
    <div>Despesas: <strong>${totalExpenses}</strong></div>
    <div>Saldo: <strong>${balance}</strong></div>
  </div>
  <table>
    <thead><tr><th>Data</th><th>Descricao</th><th>Valor</th><th>Categoria</th></tr></thead>
    <tbody>${tableRows}</tbody>
  </table>
</body>
</html>`;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }
}

// --- Helpers ---

function triggerDownload(
  content: string,
  filename: string,
  mimeType: string
): void {
  const blob = new Blob(['\uFEFF' + content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function formatCurrency(value: number): string {
  return `R$ ${value.toFixed(2).replace('.', ',')}`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
