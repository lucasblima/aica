/**
 * Content Extraction Service
 *
 * Handles extraction of content from various sources:
 * - URLs: Fetches and extracts text content from web pages
 * - Files: Processes PDF, DOCX, TXT files
 *
 * Uses Gemini API for intelligent content extraction and summarization
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY not found in environment variables');
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

export interface ExtractedContent {
    content: string;
    summary: string;
    relevantPoints: string[];
    source: string;
    extractedAt: Date;
}

/**
 * Fetch and extract content from a URL using Gemini
 *
 * Uses Gemini to fetch and intelligently extract relevant content from a webpage.
 * Focuses on main content, removing ads, navigation, and other noise.
 *
 * @param url - The URL to fetch content from
 * @returns Extracted and summarized content
 */
export async function fetchUrlContent(url: string): Promise<ExtractedContent> {
    try {
        console.log('[fetchUrlContent] Fetching content from:', url);

        // Validate URL
        const urlPattern = /^https?:\/\/.+/i;
        if (!urlPattern.test(url)) {
            throw new Error('URL inválida. Use http:// ou https://');
        }

        // Use Gemini to fetch and extract content from the URL
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

        const prompt = `
Você é um assistente especializado em extrair conteúdo relevante de páginas web.

Acesse o seguinte URL e extraia o conteúdo principal:
${url}

INSTRUÇÕES:
1. Foque no conteúdo principal da página (artigo, texto, informações)
2. Ignore menus, navegação, anúncios, rodapé
3. Extraia apenas informações relevantes e úteis
4. Se for uma página sobre uma pessoa, foque em biografia, conquistas, dados relevantes
5. Se for um artigo/notícia, extraia os pontos principais

FORMATO DA RESPOSTA (JSON):
{
  "content": "Conteúdo completo extraído em português",
  "summary": "Resumo em 2-3 parágrafos do conteúdo principal",
  "relevantPoints": ["ponto 1", "ponto 2", "ponto 3"]
}

Retorne APENAS o JSON, sem markdown ou formatação adicional.
`;

        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();

        console.log('[fetchUrlContent] Gemini response:', text.substring(0, 200));

        // Parse JSON response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('Não foi possível extrair JSON da resposta do Gemini');
        }

        const extracted = JSON.parse(jsonMatch[0]);

        return {
            content: extracted.content || '',
            summary: extracted.summary || '',
            relevantPoints: extracted.relevantPoints || [],
            source: url,
            extractedAt: new Date()
        };

    } catch (error) {
        console.error('[fetchUrlContent] Error:', error);
        throw new Error(
            error instanceof Error
                ? `Erro ao buscar conteúdo da URL: ${error.message}`
                : 'Erro desconhecido ao buscar conteúdo da URL'
        );
    }
}

/**
 * Process and extract content from a file (PDF, DOCX, TXT)
 *
 * @param file - The file to process
 * @returns Extracted and summarized content
 */
export async function processFileContent(file: File): Promise<ExtractedContent> {
    try {
        console.log('[processFileContent] Processing file:', file.name, 'Type:', file.type);

        const fileExtension = file.name.split('.').pop()?.toLowerCase();

        // Handle different file types
        switch (fileExtension) {
            case 'txt':
                return await processTxtFile(file);
            case 'pdf':
                return await processPdfFile(file);
            case 'docx':
                return await processDocxFile(file);
            default:
                throw new Error(`Tipo de arquivo não suportado: ${fileExtension}. Use TXT, PDF ou DOCX.`);
        }

    } catch (error) {
        console.error('[processFileContent] Error:', error);
        throw new Error(
            error instanceof Error
                ? `Erro ao processar arquivo: ${error.message}`
                : 'Erro desconhecido ao processar arquivo'
        );
    }
}

/**
 * Process TXT file
 */
async function processTxtFile(file: File): Promise<ExtractedContent> {
    const text = await file.text();

    if (!text.trim()) {
        throw new Error('Arquivo TXT vazio');
    }

    // Use Gemini to summarize and extract relevant points
    return await summarizeContent(text, file.name);
}

/**
 * Process PDF file using Gemini File API
 */
async function processPdfFile(file: File): Promise<ExtractedContent> {
    try {
        // Upload PDF to Gemini File API
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

        // Convert File to base64
        const arrayBuffer = await file.arrayBuffer();
        const base64 = btoa(
            new Uint8Array(arrayBuffer)
                .reduce((data, byte) => data + String.fromCharCode(byte), '')
        );

        const prompt = `
Você é um assistente especializado em extrair conteúdo de documentos PDF.

Analise o PDF anexado e extraia as informações mais relevantes.

INSTRUÇÕES:
1. Identifique o tipo de documento (biografia, artigo, relatório, etc.)
2. Extraia os pontos principais e informações mais relevantes
3. Foque em dados concretos, nomes, datas, conquistas, fatos
4. Ignore cabeçalhos, rodapés, números de página

FORMATO DA RESPOSTA (JSON):
{
  "content": "Conteúdo completo extraído em português",
  "summary": "Resumo em 2-3 parágrafos do conteúdo principal",
  "relevantPoints": ["ponto 1", "ponto 2", "ponto 3"]
}

Retorne APENAS o JSON, sem markdown ou formatação adicional.
`;

        const result = await model.generateContent([
            {
                inlineData: {
                    mimeType: 'application/pdf',
                    data: base64
                }
            },
            { text: prompt }
        ]);

        const response = result.response;
        const text = response.text();

        console.log('[processPdfFile] Gemini response:', text.substring(0, 200));

        // Parse JSON response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('Não foi possível extrair JSON da resposta do Gemini');
        }

        const extracted = JSON.parse(jsonMatch[0]);

        return {
            content: extracted.content || '',
            summary: extracted.summary || '',
            relevantPoints: extracted.relevantPoints || [],
            source: file.name,
            extractedAt: new Date()
        };

    } catch (error) {
        console.error('[processPdfFile] Error:', error);
        throw new Error('Erro ao processar PDF. Verifique se o arquivo não está corrompido.');
    }
}

/**
 * Process DOCX file
 * Note: This requires mammoth library for proper DOCX parsing
 */
async function processDocxFile(file: File): Promise<ExtractedContent> {
    try {
        // Check if mammoth is available
        const mammoth = await import('mammoth');

        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        const text = result.value;

        if (!text.trim()) {
            throw new Error('Arquivo DOCX vazio ou não pôde ser lido');
        }

        // Use Gemini to summarize and extract relevant points
        return await summarizeContent(text, file.name);

    } catch (error) {
        console.error('[processDocxFile] Error:', error);

        if (error instanceof Error && error.message.includes('Cannot find module')) {
            throw new Error('Biblioteca mammoth não instalada. Processamento de DOCX não disponível.');
        }

        throw new Error('Erro ao processar DOCX. Verifique se o arquivo não está corrompido.');
    }
}

/**
 * Use Gemini to summarize content and extract relevant points
 */
async function summarizeContent(content: string, sourceName: string): Promise<ExtractedContent> {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    const prompt = `
Você é um assistente especializado em análise de conteúdo para preparação de entrevistas.

Analise o seguinte texto e extraia as informações mais relevantes:

${content}

INSTRUÇÕES:
1. Identifique os pontos principais e informações mais relevantes
2. Foque em dados concretos, nomes, datas, conquistas, fatos
3. Organize as informações de forma clara e objetiva
4. Destaque aspectos que seriam interessantes para uma entrevista

FORMATO DA RESPOSTA (JSON):
{
  "content": "Texto original (pode ser resumido se muito longo)",
  "summary": "Resumo em 2-3 parágrafos do conteúdo principal",
  "relevantPoints": ["ponto 1", "ponto 2", "ponto 3", "ponto 4", "ponto 5"]
}

Retorne APENAS o JSON, sem markdown ou formatação adicional.
`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    console.log('[summarizeContent] Gemini response:', text.substring(0, 200));

    // Parse JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        // Fallback: return original content without AI processing
        console.warn('[summarizeContent] Could not parse JSON, returning original content');
        return {
            content: content.substring(0, 5000), // Limit to 5000 chars
            summary: 'Conteúdo extraído com sucesso. Processamento automático indisponível.',
            relevantPoints: [],
            source: sourceName,
            extractedAt: new Date()
        };
    }

    const extracted = JSON.parse(jsonMatch[0]);

    return {
        content: extracted.content || content.substring(0, 5000),
        summary: extracted.summary || '',
        relevantPoints: extracted.relevantPoints || [],
        source: sourceName,
        extractedAt: new Date()
    };
}
