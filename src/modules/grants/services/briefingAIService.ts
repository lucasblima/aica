/**
 * Briefing AI Service - Geração automática de briefing com IA
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import type { BriefingData } from '../types';

/**
 * Gera briefing completo automaticamente com base em contexto mínimo
 */
export async function generateAutoBriefing(context: {
  companyName?: string;
  projectIdea?: string;
  editalTitle?: string;
  editalText?: string;
}): Promise<BriefingData> {
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
        maxOutputTokens: 4000,
      },
    });

    const systemPrompt = `Você é um especialista em planejamento de projetos de inovação para editais de fomento no Brasil.

Sua tarefa é gerar um briefing completo e detalhado para um projeto, que será usado posteriormente para preencher o formulário de inscrição de um edital.

IMPORTANTE:
1. Gere conteúdos REALISTAS e ESPECÍFICOS (não use placeholders genéricos)
2. Use números, datas, valores quando apropriado
3. Seja detalhado mas objetivo
4. Foque em inovação tecnológica e impacto de mercado
5. Retorne APENAS o JSON, sem texto adicional

ESTRUTURA DO JSON:
{
  "company_context": "Texto de 200-500 palavras sobre a empresa",
  "project_description": "Texto de 300-600 palavras sobre o projeto",
  "technical_innovation": "Texto de 200-400 palavras sobre inovação técnica",
  "market_differential": "Texto de 200-400 palavras sobre diferencial de mercado",
  "team_expertise": "Texto de 150-300 palavras sobre a equipe",
  "expected_results": "Texto de 200-400 palavras sobre resultados esperados",
  "sustainability": "Texto de 150-300 palavras sobre sustentabilidade financeira",
  "additional_notes": "Texto de 100-200 palavras com informações adicionais"
}

EXEMPLO DE QUALIDADE ESPERADA:
{
  "company_context": "A [Nome] é uma startup de biotecnologia fundada em 2020 no Rio de Janeiro, especializada no desenvolvimento de soluções diagnósticas baseadas em inteligência artificial. A empresa conta atualmente com 15 colaboradores, sendo 8 pesquisadores com formação em biologia molecular, ciência da computação e bioinformática. Desde sua fundação, a empresa já desenvolveu 2 protótipos de sistemas de diagnóstico e estabeleceu parcerias com 3 hospitais de referência para testes clínicos. A empresa possui um laboratório de 200m² equipado com infraestrutura completa para análises moleculares e um data center para processamento de IA..."
}`;

    const userPrompt = `Gere um briefing completo para este projeto:

INFORMAÇÕES FORNECIDAS:
${context.companyName ? `- Nome da empresa: ${context.companyName}` : ''}
${context.projectIdea ? `- Ideia do projeto: ${context.projectIdea}` : ''}
${context.editalTitle ? `- Edital: ${context.editalTitle}` : ''}
${context.editalText ? `- Resumo do edital: ${context.editalText.substring(0, 1000)}...` : ''}

${!context.companyName && !context.projectIdea ?
  'ATENÇÃO: Poucas informações foram fornecidas. Crie um briefing EXEMPLO realista e completo para uma startup brasileira de tecnologia.' :
  'Com base nas informações acima, gere um briefing detalhado e convincente.'
}

Retorne APENAS o JSON com os 8 campos preenchidos.`;

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
