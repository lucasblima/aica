import { GoogleGenAI } from "@google/genai";
import { Dossier } from "../types";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

/**
 * Generate intelligent, contextual search queries based on guest data and topics.
 * Uses TechnicalSheet when available for more specific searches.
 */
export const generateIntelligentSearchQueries = async (
    dossier: Dossier,
    topics: string[]
): Promise<string[]> => {
    const modelId = "gemini-2.5-flash";

    // Build context from technical sheet if available
    let technicalContext = "";
    if (dossier.technicalSheet) {
        const ts = dossier.technicalSheet;
        if (ts.fullName) technicalContext += `Nome Completo: ${ts.fullName}\n`;
        if (ts.birthInfo?.city) {
            technicalContext += `Naturalidade: ${ts.birthInfo.city}${ts.birthInfo.state ? ', ' + ts.birthInfo.state : ''}\n`;
        }
        if (ts.careerHighlights && ts.careerHighlights.length > 0) {
            technicalContext += `Carreira:\n${ts.careerHighlights.map(c => `- ${c.title} em ${c.organization}`).join('\n')}\n`;
        }
    }

    const topicsText = topics.slice(0, 5).map((t, i) => `${i + 1}. ${t}`).join('\n');

    const prompt = `
    Você é um pesquisador especializado em gerar queries de busca para encontrar notícias relevantes.
    
    CONVIDADO:
    Nome: ${dossier.guestName}
    ${technicalContext}
    
    TEMA DO EPISÓDIO: ${dossier.episodeTheme}
    
    ${topicsText ? `TÓPICOS DA PAUTA:\n${topicsText}` : ''}
    
    TAREFA: Gere 5 queries de busca que encontrem notícias RELEVANTES para esta entrevista.
    Cada query deve conectar o convidado com temas específicos da pauta ou do contexto biográfico.
    
    REGRAS:
    - Seja específico: use nomes de lugares, cargos, eventos, organizações
    - Conecte com os tópicos: relacione o convidado com assuntos da pauta
    - Evite queries genéricas demais
    - Use aspas para termos exatos quando apropriado
    - Foque em notícias recentes (últimos 12 meses)
    
    FORMATO: Retorne APENAS um array JSON de strings
    ["query 1", "query 2", "query 3", "query 4", "query 5"]
  `;

    try {
        const response = await ai.models.generateContent({
            model: modelId,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                temperature: 0.7
            }
        });

        if (response.text) {
            const queries = JSON.parse(response.text);
            if (Array.isArray(queries) && queries.length > 0) {
                console.log("Queries inteligentes geradas:", queries);
                return queries.slice(0, 5); // Ensure max 5 queries
            }
        }
    } catch (error) {
        console.error("Erro ao gerar queries inteligentes:", error);
    }

    // Fallback: simple query combining name and theme
    console.log("Usando query fallback");
    return [`${dossier.guestName} ${dossier.episodeTheme}`];
};
