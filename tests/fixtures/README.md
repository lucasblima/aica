# Test Fixtures

This directory contains test data files used in E2E tests for the Gemini integration.

## Files Needed

### Finance Module

#### `bank-statement-with-pii.pdf`
A sample bank statement PDF containing:
- Transaction history
- CPF/CNPJ (Brazilian tax IDs) - **to test PII sanitization**
- Account numbers
- Personal information

**How to create:**
1. Generate a fake bank statement using any PDF creator
2. Include realistic transaction data
3. Add fake CPF: `123.456.789-00`
4. Add fake CNPJ: `12.345.678/0001-90`
5. Include account number: `001-12345-6`

**Purpose:** Test that PII detection and sanitization works correctly.

#### `bank-statement-clean.pdf`
A sample bank statement without PII for testing normal PDF processing.

### Memory Module

#### `mock-whatsapp-messages.json`
Sample WhatsApp messages for testing insight extraction:

```json
[
  {
    "sender": "João Silva",
    "message": "Reunião com o cliente foi muito estressante hoje. Eles querem tudo pronto até sexta!",
    "timestamp": "2024-01-15T14:30:00Z",
    "expected_sentiment": "negative",
    "expected_triggers": ["work_deadline", "personal_stress"],
    "expected_subjects": ["work"]
  },
  {
    "sender": "Maria Santos",
    "message": "Parabéns pela promoção! Você merece muito, sempre foi dedicado!",
    "timestamp": "2024-01-15T16:45:00Z",
    "expected_sentiment": "positive",
    "expected_triggers": ["achievement", "celebration"],
    "expected_subjects": ["work", "relationships"]
  },
  {
    "sender": "Pedro Costa",
    "message": "Preciso marcar aquela consulta médica que estava adiando. Dores de cabeça frequentes.",
    "timestamp": "2024-01-16T09:20:00Z",
    "expected_sentiment": "neutral",
    "expected_triggers": ["health_concern"],
    "expected_subjects": ["health"]
  }
]
```

### Atlas Module

#### `test-tasks.json`
Sample tasks for testing auto-categorization:

```json
[
  {
    "description": "Preparar apresentação para reunião de vendas Q4",
    "expected_category": "Trabalho"
  },
  {
    "description": "Marcar consulta com dentista para canal",
    "expected_category": "Saúde"
  },
  {
    "description": "Pagar conta de luz e água do mês",
    "expected_category": "Finanças"
  },
  {
    "description": "Estudar para certificação AWS Solutions Architect",
    "expected_category": "Educação"
  },
  {
    "description": "Comprar presente de aniversário para mãe",
    "expected_category": "Pessoal"
  },
  {
    "description": "Organizar gaveta da cozinha",
    "expected_category": "Outros"
  }
]
```

## Creating Test PDFs

### Using LibreOffice/Word

1. Create a document with bank statement format
2. Add transactions table
3. Include PII data (fake CPF, CNPJ)
4. Export as PDF

### Using Python (pdfkit)

```python
import pdfkit

html_content = """
<html>
<head><title>Extrato Bancário</title></head>
<body>
  <h1>Banco Test - Extrato Bancário</h1>
  <p>Cliente: João Silva</p>
  <p>CPF: 123.456.789-00</p>
  <p>Conta: 001-12345-6</p>

  <table>
    <tr><th>Data</th><th>Descrição</th><th>Valor</th></tr>
    <tr><td>01/01/2024</td><td>Supermercado XYZ</td><td>-R$ 350,00</td></tr>
    <tr><td>05/01/2024</td><td>Salário</td><td>+R$ 5.000,00</td></tr>
  </table>
</body>
</html>
"""

pdfkit.from_string(html_content, 'bank-statement-with-pii.pdf')
```

## Using Fixtures in Tests

```typescript
import * as path from 'path';

test('should process PDF', async ({ page }) => {
  const pdfPath = path.join(__dirname, '../fixtures/bank-statement-with-pii.pdf');
  await page.setInputFiles('input[type="file"]', pdfPath);
});
```

## Important Notes

1. **Never commit real PII data** to the repository
2. All data in fixtures should be **completely fake**
3. Use realistic but clearly synthetic names (e.g., "João Silva", not real people)
4. CPF/CNPJ should be invalid checksums or clearly marked as test data
5. Phone numbers should use test ranges (e.g., `(11) 99999-9999`)

## Generating Fake Data

### Brazilian CPF (fake)
Use: `123.456.789-00` (invalid checksum, safe for testing)

### Brazilian CNPJ (fake)
Use: `12.345.678/0001-90` (invalid checksum, safe for testing)

### Phone Numbers (fake)
Use: `(11) 99999-9999` or `(21) 98888-8888`

### Email Addresses (fake)
Use: `test@example.com`, `fake.user@test.aica.app`

## Validation

Before committing fixtures, ensure:
- [ ] No real PII
- [ ] Data is clearly synthetic
- [ ] Files are small (< 1MB each)
- [ ] JSON is valid and formatted
- [ ] PDFs are readable and structured correctly
