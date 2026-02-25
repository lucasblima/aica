/**
 * Generate synthetic PDF fixtures for Grants module E2E tests.
 *
 * Run: npx tsx tests/fixtures/generate-test-pdfs.ts
 *
 * Produces 5 small PDFs (~1-3 KB each) whose text content matches
 * the keywords the document-classifier Edge Function looks for.
 */

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface PdfSpec {
  filename: string;
  expectedType: string;
  lines: string[];
}

const specs: PdfSpec[] = [
  {
    filename: 'test-rouanet.pdf',
    expectedType: 'projeto_rouanet',
    lines: [
      'PROJETO CULTURAL - LEI ROUANET',
      '',
      'Fundamentacao Legal: Lei 8.313/1991',
      'PRONAC: 24-99001',
      'CNPJ: 12.345.678/0001-99',
      '',
      'Valor Solicitado: R$ 50.000,00',
      '',
      'Ministerio da Cultura - MinC',
      'Secretaria Especial da Cultura',
      '',
      'Este projeto visa promover a cultura brasileira',
      'por meio de acoes artisticas e educativas.',
    ],
  },
  {
    filename: 'test-edital.pdf',
    expectedType: 'edital',
    lines: [
      'CHAMADA PUBLICA N. 01/2024',
      '',
      'EDITAL DE SELECAO',
      '',
      'O presente edital tem por objetivo selecionar',
      'projetos culturais para financiamento publico.',
      '',
      'Prazo: 15/06/2024',
      'Valor total disponivel: R$ 100.000,00',
      '',
      'Criterios de avaliacao:',
      '1. Relevancia cultural',
      '2. Viabilidade tecnica',
      '3. Impacto social',
    ],
  },
  {
    filename: 'test-estatuto.pdf',
    expectedType: 'estatuto_social',
    lines: [
      'ESTATUTO SOCIAL',
      '',
      'Associacao Cultural Exemplo',
      'CNPJ: 12.345.678/0001-99',
      '',
      'Capitulo I - Da Denominacao e Objeto Social',
      'Art. 1 - A associacao tem por objeto social a',
      'promocao de atividades culturais e educativas.',
      '',
      'Capitulo II - Da Assembleia Geral',
      'Art. 5 - A Assembleia Geral e o orgao soberano',
      'da associacao, reunindo-se ordinariamente uma',
      'vez por ano.',
    ],
  },
  {
    filename: 'test-apresentacao.pdf',
    expectedType: 'apresentacao_institucional',
    lines: [
      'APRESENTACAO INSTITUCIONAL',
      '',
      'QUEM SOMOS',
      'Somos uma organizacao dedicada a cultura.',
      '',
      'Missao: Democratizar o acesso a cultura.',
      'Visao: Ser referencia em gestao cultural.',
      '',
      'Historico:',
      'Fundada em 2010, a organizacao ja realizou',
      'mais de 200 projetos culturais em todo o Brasil.',
    ],
  },
  {
    filename: 'test-relatorio.pdf',
    expectedType: 'relatorio_execucao',
    lines: [
      'RELATORIO DE EXECUCAO',
      '',
      'Prestacao de Contas - Exercicio 2024',
      '',
      'Valor Aprovado: R$ 45.000,00',
      'Valor Executado: R$ 42.350,00',
      '',
      'Resumo das atividades realizadas:',
      '- 12 oficinas de formacao artistica',
      '- 3 apresentacoes publicas',
      '- 500 pessoas beneficiadas',
      '',
      'O projeto foi executado conforme o plano de',
      'trabalho aprovado pelo orgao financiador.',
    ],
  },
];

async function generatePdf(spec: PdfSpec): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

  // A4 dimensions in points
  const width = 595.28;
  const height = 841.89;
  const page = doc.addPage([width, height]);

  const fontSize = 12;
  const titleFontSize = 16;
  const lineHeight = 18;
  let y = height - 60;

  for (const line of spec.lines) {
    if (y < 60) break; // don't overflow page

    const isTitle = line === spec.lines[0];
    const currentFont = isTitle ? boldFont : font;
    const currentSize = isTitle ? titleFontSize : fontSize;

    if (line === '') {
      y -= lineHeight * 0.6;
      continue;
    }

    page.drawText(line, {
      x: 50,
      y,
      size: currentSize,
      font: currentFont,
      color: rgb(0, 0, 0),
    });

    y -= lineHeight;
  }

  return doc.save();
}

async function main() {
  console.log('Generating synthetic PDF fixtures...\n');

  for (const spec of specs) {
    const bytes = await generatePdf(spec);
    const outPath = join(__dirname, spec.filename);
    writeFileSync(outPath, bytes);
    console.log(
      `  ${spec.filename}  (${bytes.length} bytes)  expectedType=${spec.expectedType}`
    );
  }

  console.log('\nDone. All fixtures written to tests/fixtures/');
}

main().catch((err) => {
  console.error('Failed to generate PDFs:', err);
  process.exit(1);
});
