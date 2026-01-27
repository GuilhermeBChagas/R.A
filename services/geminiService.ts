
import { GoogleGenAI, Type } from "@google/genai";

// Initialize the Gemini API client using the environment-provided API KEY.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeIncident = async (description: string): Promise<{ summary: string, severity: 'Baixa' | 'Média' | 'Alta' }> => {
  try {
    const model = 'gemini-3-flash-preview';
    const prompt = `Analise a seguinte descrição de uma ocorrência predial feita por um vigilante. 
    Resuma o problema de forma técnica e sugira uma severidade (Baixa, Média, Alta).
    
    Descrição: "${description}"`;

    // Fix: Using direct generateContent call as per guidelines.
    // Using Type.OBJECT and propertyOrdering for structured JSON response.
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: {
              type: Type.STRING,
              description: "Um resumo técnico e profissional da ocorrência.",
            },
            severity: {
              type: Type.STRING,
              description: "O nível de severidade estimado (Baixa, Média ou Alta).",
            },
          },
          propertyOrdering: ["summary", "severity"],
        },
      },
    });

    // Access the .text property directly (not a method).
    const text = response.text;
    if (!text) throw new Error("No response from AI");

    const result = JSON.parse(text.trim());
    return {
        summary: result.summary,
        severity: result.severity as 'Baixa' | 'Média' | 'Alta'
    };

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    // Fallback if AI fails or thinking budget/max tokens are reached unexpectedly.
    return {
      summary: "Não foi possível analisar automaticamente.",
      severity: "Média"
    };
  }
};
