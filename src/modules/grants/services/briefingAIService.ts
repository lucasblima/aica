/**
 * Briefing AI Service - Geração automática de briefing com IA
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import type { BriefingData } from '../types';

/**
 * Contexto para geracao de briefing
 */
export interface BriefingGenerationContext {
  companyName?: string;
  projectIdea?: string;
  editalTitle?: string;
  editalText?: string;
  /** Conteudo do documento fonte (PDF, MD, TXT, DOCX) - PRINCIPAL FONTE DE DADOS */
  sourceDocumentContent?: string | null;
}

/**
 * Gera briefing completo automaticamente com base no documento fonte
 *
 * IMPORTANTE: Esta funcao EXTRAI informacoes do documento fonte fornecido.
 * NAO inventa dados se o documento nao for fornecido.
 *
 * @param context - Contexto incluindo o documento fonte
 * @returns Briefing extraido do documento
 * @throws Error se documento fonte nao for fornecido ou API falhar
 */
export async function generateAutoBriefing(context: BriefingGenerationContext): Promise<BriefingData> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('VITE_GEMINI_API_KEY não configurada');
  }

  // VALIDACAO CRITICA: Exigir documento fonte para evitar alucinacao
  const hasSourceDocument = context.sourceDocumentContent && context.sourceDocumentContent.trim().length > 100;
  const hasMinimalContext = context.companyName || context.projectIdea;

  if (!hasSourceDocument && !hasMinimalContext) {
    throw new Error(
      'Documento fonte obrigatório. Faça upload de um arquivo (.pdf, .md, .txt, .docx) com informações do seu projeto antes de usar o preenchimento automático.'
    );
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: 0.3, // Temperatura baixa para ser mais factual e menos criativo
        topK: 20,
        topP: 0.8,
        maxOutputTokens: 4000,
      },
    });

    // System prompt focado em EXTRACAO, nao CRIACAO
    const systemPrompt = `Você é um especialista em análise de documentos para editais de fomento no Brasil.

Sua tarefa é EXTRAIR e ORGANIZAR informações de um documento fonte fornecido pelo usuário para preencher um briefing de projeto.

REGRAS CRÍTICAS - SIGA RIGOROSAMENTE:
1. APENAS EXTRAIA informações que estão EXPLICITAMENTE no documento fonte
2. NUNCA invente dados, números, nomes ou informações não presentes no documento
3. Se uma informação não estiver no documento, escreva: "[Informação não encontrada no documento - preencher manualmente]"
4. Use CITAÇÕES DIRETAS do documento quando possível
5. Mantenha a linguagem original do documento
6. Se o documento for incompleto, indique claramente o que está faltando
7. Retorne APENAS o JSON, sem texto adicional

ESTRUTURA DO JSON:
{
  "company_context": "Extrair: nome da empresa, área de atuação, histórico, equipe, localização",
  "project_description": "Extrair: objetivo do projeto, escopo, metodologia, etapas",
  "technical_innovation": "Extrair: tecnologias utilizadas, diferenciais técnicos, patentes, P&D",
  "market_differential": "Extrair: mercado-alvo, concorrentes, vantagens competitivas, modelo de negócio",
  "team_expertise": "Extrair: membros da equipe, formação, experiência, currículo",
  "expected_results": "Extrair: metas, indicadores, entregas, cronograma",
  "sustainability": "Extrair: modelo de receita, projeções financeiras, sustentabilidade pós-fomento",
  "additional_notes": "Extrair: parcerias, prêmios, certificações, informações complementares"
}

Se o campo não tiver informação no documento, retorne:
"[Campo não encontrado no documento fonte. Por favor, preencha manualmente com informações sobre: <descrição do que é esperado>]"`;

    // User prompt com foco no documento fonte
    const userPrompt = hasSourceDocument
      ? `DOCUMENTO FONTE DO PROJETO:
---
${context.sourceDocumentContent!.substring(0, 30000)}
${context.sourceDocumentContent!.length > 30000 ? '\n[... documento truncado por limite de tokens ...]' : ''}
---

CONTEXTO ADICIONAL:
${context.editalTitle ? `- Edital alvo: ${context.editalTitle}` : ''}
${context.editalText ? `- Requisitos do edital: ${context.editalText.substring(0, 2000)}` : ''}

INSTRUÇÃO: Analise o DOCUMENTO FONTE acima e EXTRAIA as informações para preencher cada campo do briefing.
NÃO INVENTE nenhuma informação. Se algo não estiver no documento, indique claramente.

Retorne APENAS o JSON com os 8 campos.`
      : `INFORMAÇÕES DISPONÍVEIS (sem documento fonte completo):
${context.companyName ? `- Nome/contexto da empresa: ${context.companyName}` : ''}
${context.projectIdea ? `- Ideia do projeto: ${context.projectIdea}` : ''}
${context.editalTitle ? `- Edital: ${context.editalTitle}` : ''}

ATENÇÃO: Documento fonte não foi fornecido.
Organize as poucas informações disponíveis nos campos apropriados.
Para campos sem informação, retorne a mensagem padrão indicando preenchimento manual.

Retorne APENAS o JSON com os 8 campos.`;

    const result = await model.generateContent([
      { text: systemPrompt },
      { text: userPrompt }
    ]);

    const response = result.response;
    let jsonText = response.text();

    // Limpar markdown se existir
    jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    // Parse JSON
    const data = JSON.parse(jsonText);

    console.log('[Briefing AI] Briefing gerado com sucesso:', {
      fields: Object.keys(data).length,
      totalChars: JSON.stringify(data).length
    });

    return data as BriefingData;
  } catch (error) {
    console.error('Erro ao gerar briefing automático:', error);
    throw new Error('Falha ao gerar briefing. Tente preencher manualmente.');
  }
}

/**
 * Melhora/expande um campo específico do briefing
 */
export async function improveBriefingField(
  fieldId: keyof BriefingData,
  currentContent: string,
  allBriefing: BriefingData
): Promise<string> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('VITE_GEMINI_API_KEY não configurada');
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2000,
      },
    });

    const fieldLabels: Record<keyof BriefingData, string> = {
      company_context: 'Contexto da Empresa',
      project_description: 'Descrição do Projeto',
      technical_innovation: 'Inovação Técnica',
      market_differential: 'Diferencial de Mercado',
      team_expertise: 'Expertise da Equipe',
      expected_results: 'Resultados Esperados',
      sustainability: 'Sustentabilidade',
      additional_notes: 'Informações Adicionais'
    };

    const prompt = `Você é um especialista em redação de projetos para editais de inovação.

TAREFA: Melhore e expanda o seguinte texto do campo "${fieldLabels[fieldId]}":

TEXTO ATUAL:
${currentContent}

CONTEXTO ADICIONAL (outros campos preenchidos):
${JSON.stringify(allBriefing, null, 2)}

INSTRUÇÕES:
1. Expanda o texto atual para 300-500 palavras
2. Adicione detalhes técnicos e números específicos
3. Mantenha coerência com os outros campos
4. Use linguagem profissional mas acessível
5. Retorne APENAS o texto melhorado, sem introdução ou conclusão

Texto melhorado:`;

    const result = await model.generateContent(prompt);
    const improved = result.response.text().trim();

    return improved;
  } catch (error) {
    console.error('Erro ao melhorar campo:', error);
    throw new Error('Falha ao melhorar o texto.');
  }
}
