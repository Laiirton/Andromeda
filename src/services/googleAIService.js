import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";
import { GoogleAIFileManager } from "@google/generative-ai/files";
import fs from "fs";
import dotenv from "dotenv";
dotenv.config();

const apiKey = process.env.GOOGLE_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

const model = genAI.getGenerativeModel({
  model: "gemini-exp-1114",
  systemInstruction: ``,
});

const generationConfig = {
  temperature: 0.7,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 8192,
  responseMimeType: "text/plain",
};

const MAX_RETRIES = 3;
const RETRY_DELAY = 10000;

export async function getGeminiResponse(prompt) {
  let retries = 0;
  let result;

  while (retries < MAX_RETRIES) {
    try {
      console.log(`Tentativa #${retries + 1} para o prompt: ${prompt}`);
      const chatSession = model.startChat({
        generationConfig,
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
        ],
        history: [],
      });

      result = await chatSession.sendMessage(prompt);
      console.log(`Solicitação bem-sucedida na tentativa #${retries + 1}!`);
      break;
    } catch (error) {
      retries++;
      console.error(`Erro na tentativa #${retries}: ${error.message}`);
      if (retries === MAX_RETRIES) {
        throw new Error("Falha ao obter resposta após várias tentativas.");
      }
      console.error(
        `Erro: ${error.message}, tentando novamente em ${RETRY_DELAY / 1000} segundos...`
      );
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
    }
  }

  return result.response.text();
}
