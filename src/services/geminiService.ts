import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const suggestStreamTitles = async (topic: string): Promise<string[]> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Eres un experto en marketing de streaming. Genera 5 títulos llamativos y "clickbait" (pero honestos) para un directo sobre el siguiente tema: "${topic}". Los títulos deben estar en español y ser cortos. Devuelve solo un array JSON de strings.`,
      config: {
        responseMimeType: "application/json",
      },
    });

    const text = response.text;
    if (!text) return [];
    return JSON.parse(text);
  } catch (error) {
    console.error("Error generating stream titles:", error);
    return ["¡Mi primer directo!", "Charlando con la comunidad", "Jugando un rato", "Viernes de relax", "Especial de hoy"];
  }
};

export const suggestBio = async (name: string, interests: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Genera una biografía corta y atractiva para un perfil de streamer llamado "${name}". Sus intereses son: "${interests}". La biografía debe ser en español, divertida y tener menos de 150 caracteres. Devuelve solo el texto de la biografía.`,
    });

    return response.text || "¡Bienvenido a mi canal!";
  } catch (error) {
    console.error("Error generating bio:", error);
    return "¡Hola! Bienvenido a mi canal.";
  }
};

export const suggestChatMessages = async (streamTitle: string, streamerName: string): Promise<string[]> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Eres un espectador entusiasta en un directo de streaming. Genera 4 mensajes cortos y amigables para enviar en el chat del directo titulado "${streamTitle}" del streamer "${streamerName}". Los mensajes deben ser en español, variados (un saludo, una pregunta, un cumplido, una reacción) y usar emojis. Devuelve solo un array JSON de strings.`,
      config: {
        responseMimeType: "application/json",
      },
    });

    const text = response.text;
    if (!text) return [];
    return JSON.parse(text);
  } catch (error) {
    console.error("Error generating chat messages:", error);
    return ["¡Hola! 👋", "¿Cómo va todo? 🤔", "¡Qué buen directo! 🔥", "¡Increíble! 🚀"];
  }
};

export const suggestStreamTags = async (title: string): Promise<string[]> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Genera 3 etiquetas (tags) cortas y relevantes para un directo de streaming titulado "${title}". Las etiquetas deben estar en español, ser de una sola palabra y empezar con #. Devuelve solo un array JSON de strings.`,
      config: {
        responseMimeType: "application/json",
      },
    });

    const text = response.text;
    if (!text) return [];
    return JSON.parse(text);
  } catch (error) {
    console.error("Error generating stream tags:", error);
    return ["#Streaming", "#EnVivo", "#Comunidad"];
  }
};
