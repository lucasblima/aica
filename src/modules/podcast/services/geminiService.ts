import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Dossier } from "../types";

// Initialize the client safely
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

// --- DEEP RESEARCH (PREPARATION) ---

export const suggestTrendingGuest = async (): Promise<string> => {
  const modelId = "gemini-2.5-flash";

  const prompt = `
    Atue como um produtor de podcast antenado.
    Sugira o nome de UMA personalidade que está em alta (trending) no Brasil para ser entrevistada.
    Pode ser de tecnologia, política, entretenimento, esportes ou ciência.
    Retorne APENAS o nome da pessoa. Sem aspas, sem pontuação extra.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        temperature: 1.0 // Higher temperature for variety
      }
    });
    return response.text?.trim() || "";
  } catch (error) {
    console.error("Erro ao sugerir convidado:", error);
    return "";
  }
};

export const suggestTrendingTheme = async (guestName: string): Promise<string> => {
  const modelId = "gemini-2.5-flash";

  const prompt = `
    Atue como um estrategista de conteúdo de podcast. 
    Analise o convidado "${guestName}".
    Com base no que é mais atual, polêmico ou tendência sobre essa pessoa hoje, sugira UM título curto e engajador para o tema do episódio.
    Retorne APENAS o texto do tema (máximo 8 palavras).
    Exemplo de retorno: "O Futuro da IA e Humanidade" ou "Escândalos Recentes e Virada na Carreira".
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        temperature: 0.7
      }
    });
    return response.text?.trim() || "Carreira e Atualidades";
  } catch (error) {
    console.error("Erro ao sugerir tema:", error);
    return "";
  }
};

export const generateDossier = async (guestName: string, theme?: string): Promise<Dossier> => {
  const modelId = "gemini-2.5-flash";

  const systemInstruction = `
    Você é o "Aica", um produtor de podcast de elite e pesquisador experiente (Deep Researcher).
    Sua tarefa é criar um dossiê detalhado e profundo para um episódio de podcast.
    O tom deve ser profissional, perspicaz e focado em gerar conversas de alto engajamento.
    
    INSTRUÇÕES DE PESQUISA:
    1. Use todo o seu conhecimento disponível para encontrar fatos reais sobre o convidado.
    2. Se o tema for vago ou não fornecido, deduza as áreas de maior interesse público atual sobre essa pessoa.
    3. Identifique polêmicas reais, notícias recentes ou debates em que a pessoa esteve envolvida.
    4. Evite platitudes genéricas. Procure por ângulos únicos e perguntas que surpreendam o convidado.
    5. Para a ficha técnica, inclua APENAS dados verificáveis e publicamente disponíveis. Não invente informações.
  `;

  let prompt = "";

  if (theme && theme.trim()) {
    prompt = `
      Realize uma pesquisa profunda (Deep Research) e gere um dossiê para o convidado: "${guestName}".
      Foco do episódio/Contexto: "${theme}".
      
      O dossiê deve conter:
      1. Biografia resumida e impactante.
      2. Polêmicas recentes, pontos de vista contrários ou fatos marcantes da carreira ligados ao tema.
      3. 5 Tópicos de conversa ordenados por potencial de engajamento viral.
      4. 3 "Quebra Gelo" inteligentes.
      5. FICHA TÉCNICA ESTRUTURADA com dados biográficos verificáveis (nome completo, nascimento, educação, carreira, preferências conhecidas).
      
      IMPORTANTE: Na ficha técnica, inclua APENAS informações publicamente disponíveis e verificáveis.
    `;
  } else {
    prompt = `
      Realize uma pesquisa profunda (Deep Research) e gere um dossiê estratégico para o convidado: "${guestName}".
      
      Como nenhum tema específico foi definido, analise o perfil público, cargo atual e notícias recentes dessa pessoa para determinar o assunto mais relevante e "quente" do momento.
      
      O dossiê deve conter:
      1. Um título sugerido para o tema (já que não foi fornecido).
      2. Biografia resumida com foco na relevância atual.
      3. Polêmicas, desafios políticos/empresariais recentes ou opiniões fortes conhecidas dessa pessoa.
      4. 5 Tópicos de conversa essenciais que um entrevistador DEVERIA perguntar.
      5. 3 "Quebra Gelo" (curiosidades ou hobbies pouco conhecidos).
      6. FICHA TÉCNICA ESTRUTURADA com dados biográficos verificáveis (nome completo, nascimento, educação, carreira, redes sociais, preferências).
      
      IMPORTANTE: Na ficha técnica, inclua APENAS informações publicamente disponíveis e verificáveis. Se não souber algum dado com certeza, deixe vazio ou null.
    `;
  }

  // Define Schema using the Type enum from @google/genai
  const dossierSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      derivedTheme: { type: Type.STRING, description: "Um título curto sugerido para o tema do episódio baseada na pesquisa" },
      biography: { type: Type.STRING, description: "Resumo biográfico do convidado focado em relevância" },
      controversies: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "Polêmicas, debates recentes ou pontos de vista fortes (fatos reais)"
      },
      suggestedTopics: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "5 tópicos de alta relevância para a conversa"
      },
      iceBreakers: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "3 perguntas ou fatos para quebrar o gelo"
      },
      technicalSheet: {
        type: Type.OBJECT,
        description: "Ficha técnica com dados biográficos estruturados e verificáveis",
        properties: {
          fullName: { type: Type.STRING, description: "Nome completo oficial" },
          nicknames: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Apelidos conhecidos"
          },
          birthInfo: {
            type: Type.OBJECT,
            properties: {
              date: { type: Type.STRING },
              city: { type: Type.STRING },
              state: { type: Type.STRING },
              country: { type: Type.STRING }
            }
          },
          education: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                degree: { type: Type.STRING },
                institution: { type: Type.STRING },
                year: { type: Type.STRING }
              }
            }
          },
          careerHighlights: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                organization: { type: Type.STRING },
                period: { type: Type.STRING }
              }
            }
          },
          preferences: {
            type: Type.OBJECT,
            properties: {
              food: { type: Type.ARRAY, items: { type: Type.STRING } },
              hobbies: { type: Type.ARRAY, items: { type: Type.STRING } },
              sports: { type: Type.ARRAY, items: { type: Type.STRING } },
              music: { type: Type.ARRAY, items: { type: Type.STRING } }
            }
          },
          socialMedia: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                platform: { type: Type.STRING },
                handle: { type: Type.STRING }
              }
            }
          },
          keyFacts: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Fatos interessantes e verificáveis"
          }
        }
      }
    },
    required: ["biography", "controversies", "suggestedTopics", "iceBreakers"]
  };

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: dossierSchema
      }
    });

    if (response.text) {
      const data = JSON.parse(response.text);
      // Use the provided theme, or the derived one from AI, or a fallback
      const finalTheme = (theme && theme.trim()) ? theme : (data.derivedTheme || "Carreira & Atualidades (Deep Research)");

      return {
        guestName,
        episodeTheme: finalTheme,
        ...data
      } as Dossier;
    }
    throw new Error("Resposta vazia do modelo.");
  } catch (error) {
    console.error("Erro ao gerar dossiê:", error);

    // Return a fallback dossier
    return {
      guestName,
      episodeTheme: theme || "Carreira & Atualidades",
      biography: "Não foi possível gerar o dossiê automaticamente.",
      controversies: [],
      suggestedTopics: [],
      iceBreakers: []
    };
  };
}

export const analyzeNews = async (articles: any[]): Promise<any[]> => {
  const modelId = "gemini-2.5-flash";

  if (articles.length === 0) return [];

  const articlesText = articles.map((a, i) => `Item ${i + 1}: ${a.title} (${a.source})`).join('\n');

  const prompt = `
    Analise as seguintes manchetes de notícias sobre um convidado de podcast.
    Para CADA item, determine:
    1. Sentimento: 'positive', 'negative' ou 'neutral'.
    2. Tópicos: Lista de até 2 tags curtas(ex: "Política", "Tecnologia").
    2. Tópicos: Lista de até 2 tags curtas(ex: "Política", "Tecnologia").

    ${articlesText}

    Retorne APENAS um JSON array com objetos contendo 'index', 'sentiment' e 'topics'.
    Exemplo: [{ "index": 0, "sentiment": "positive", "topics": ["Carreira"] }, ...]
    Exemplo: [{ "index": 0, "sentiment": "positive", "topics": ["Carreira"] }, ...]
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    if (response.text) {
      const analysis = JSON.parse(response.text);

      // Merge analysis with original articles
      return articles.map((article, idx) => {
        const result = analysis.find((a: any) => a.index === idx + 1 || a.index === idx);
        return {
          ...article,
          sentiment: result?.sentiment || 'neutral',
          topics: result?.topics || [],
          index: idx
        };
      });
    }
  } catch (error) {
    console.error("Erro na análise de notícias:", error);
  }

  return articles; // Return original if analysis fails
};

export const suggestDynamicTopic = async (
  pauta: Dossier,
  category?: { name: string; description?: string } | null
): Promise<string> => {
  const modelId = "gemini-2.5-flash";
  let categoryContext = "";

  if (category) {
    categoryContext = `
    📌 Segmento/Quadro: "${category.name}"
    ${category.description ? `Contexto: ${category.description}` : ''}
    
    IMPORTANTE: Este tópico será usado no segmento "${category.name}". Adapte a sugestão ao formato deste quadro específico.
    `;
  }

  const prompt = `
    Atue como um produtor de podcast criativo (Aica).
    O convidado é: "${pauta.guestName}".
    O tema do episódio é: "${pauta.episodeTheme}".
    
    ${categoryContext}

    Sugira UM tópico de conversa inédito, interessante e engajador para este momento.
    ${category ? `- Adequado ao formato/segmento "${category.name}"` : ''}
    - Deve ser curto (uma frase).
    - Deve provocar uma boa história ou reflexão.
    
    Retorne APENAS o texto do tópico.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: { temperature: 0.8 }
    });
    return response.text?.trim() || "";
  } catch (error) {
    console.error("Erro ao sugerir tópico:", error);
    return "";
  }
};

export const generateMoreIceBreakers = async (
  guestName: string,
  theme: string,
  existing: string[],
  count: number = 3
): Promise<string[]> => {
  const modelId = "gemini-2.5-flash";
  const prompt = `
    Gere ${count} novas perguntas "Quebra Gelo" (curiosidades, hobbies, perguntas leves) para o convidado "${guestName}".
    Tema do episódio: "${theme}".
    
    EVITE estas perguntas (já existem):
    ${existing.map(e => `- ${e}`).join('\n')}
    
    Retorne APENAS um JSON array de strings. Exemplo: ["Pergunta 1", "Pergunta 2"]
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });
    if (response.text) {
      return JSON.parse(response.text);
    }
    return [];
  } catch (error) {
    console.error("Erro ao gerar ice breakers:", error);
    return [];
  }
};

export const chatWithAica = async (message: string, context: string): Promise<string> => {
  const modelId = "gemini-2.5-flash";
  const prompt = `
    Contexto: ${context}
    
    Usuário: ${message}
    
    Aica (Host):
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt
    });
    return response.text?.trim() || "";
  } catch (error) {
    console.error("Erro no chat:", error);
    return "Desculpe, estou indisponível no momento.";
  }
};

export const getLiveClient = () => {
  return ai.live;
};
