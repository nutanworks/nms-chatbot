import { GoogleGenAI, Chat, Type, GenerateContentResponse } from "@google/genai";
import { Sentiment } from '../types';

let chat: Chat | null = null;

const getChatInstance = (): Chat => {
  if (!chat) {
    if (!process.env.API_KEY) {
      throw new Error("API_KEY environment variable not set");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: `You are a helpful and empathetic chatbot. 
        Analyze the user's sentiment from their message. 
        Your response MUST BE a valid JSON object with two keys: 
        "reply" (your text response as a string) and 
        "sentiment" (one of 'positive', 'negative', 'neutral').`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: { type: Type.STRING },
            sentiment: { type: Type.STRING }
          },
          required: ["reply", "sentiment"]
        }
      },
    });
  }
  return chat;
};

export interface BotResponse {
    reply: string;
    sentiment: Sentiment;
}

export const getBotResponse = async (message: string): Promise<BotResponse> => {
  try {
    const chatInstance = getChatInstance();
    const result: GenerateContentResponse = await chatInstance.sendMessage({ message });
    const jsonString = result.text.trim();
    
    // Sometimes the model might wrap the JSON in markdown backticks
    const cleanedJsonString = jsonString.replace(/^```json\s*|```$/g, '');
    
    const parsedResponse = JSON.parse(cleanedJsonString);

    const sentimentValue = parsedResponse.sentiment.toLowerCase();
    let sentiment: Sentiment;

    switch (sentimentValue) {
      case 'positive':
        sentiment = Sentiment.Positive;
        break;
      case 'negative':
        sentiment = Sentiment.Negative;
        break;
      default:
        sentiment = Sentiment.Neutral;
        break;
    }

    return {
      reply: parsedResponse.reply,
      sentiment: sentiment,
    };
  } catch (error) {
    console.error("Error in geminiService:", error);
    if (error instanceof SyntaxError) {
        // This is for JSON.parse failures
        throw new Error("Failed to parse bot response. The format was invalid.");
    }
    // Re-throw other errors (e.g., network, API key issues) to be handled by the UI.
    throw error;
  }
};