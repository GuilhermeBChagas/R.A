
import { GoogleGenAI, Type } from "@google/genai";

// Initialize the Gemini API client using the environment-provided API KEY.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeIncident = async (description: string): Promise<{ summary: string, severity: 'Baixa' | 'Média' | 'Alta' }> => {
  try {
    const model = 'gemini-3-flash-preview';
    
    // Instrução de Sistema: Define a "Persona" e as regras globais do modelo.
    const systemInstruction = `Você é um especialista sênior em segurança predial, manutenção e gestão de riscos.
    Sua função é analisar relatos operacionais de vigilantes e porteiros.
    
    Diretrizes:
    1. Seja técnico, direto e profissional.
    2. Ignore erros gramaticais ou de digitação do relato original.
    3. Classifique a severidade com base no risco à vida, ao patrimônio ou à operação.`;

    // Prompt do Usuário: O conteúdo específico desta requisição.
    const userPrompt = `Analise a seguinte ocorrência e extraia um resumo técnico e a severidade.
    
    Descrição Original: "${description}"`;

    const response = await ai.models.generateContent({
      model,
      contents: userPrompt,
      config: {
        systemInstruction: systemInstruction, // Configuração explícita de instrução de sistema
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: {
              type: Type.STRING,
              description: "Um resumo técnico e profissional da ocorrência, corrigindo a linguagem para padrão formal.",
            },
            severity: {
              type: Type.STRING,
              enum: ["Baixa", "Média", "Alta"],
              description: "O nível de severidade estimado.",
            },
          },
          required: ["summary", "severity"],
          propertyOrdering: ["summary", "severity"],
        },
      },
    });

    // Access the .text property directly.
    const text = response.text;
    if (!text) throw new Error("No response from AI");

    const result = JSON.parse(text.trim());
    
    // Fallback de segurança para garantir que a severidade venha formatada corretamente
    let severity: 'Baixa' | 'Média' | 'Alta' = 'Média';
    if (['Baixa', 'Média', 'Alta'].includes(result.severity)) {
        severity = result.severity;
    }

    return {
        summary: result.summary,
        severity: severity
    };

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    // Fallback if AI fails or thinking budget/max tokens are reached unexpectedly.
    return {
      summary: "Análise automática indisponível no momento. Verifique o relato original.",
      severity: "Média"
    };
  }
};
