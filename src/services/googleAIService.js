import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";
import { saveMessage, getRecentHistory } from '../database/chatHistory.js';
import dotenv from "dotenv";
dotenv.config();

const apiKey = process.env.GOOGLE_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

const model = genAI.getGenerativeModel({
  model: "gemini-exp-1121",
});

const generationConfig = {
  temperature: 1,
  topP: 0.95,
  topK: 64,
  maxOutputTokens: 8192,
  responseMimeType: "text/plain",
};

const MAX_RETRIES = 3;
const RETRY_DELAY = 10000;

function formatHistoryMessage(role, content) {
  return {
    role: role,
    parts: [{ text: content + '\n' }]
  };
}

export async function getGeminiResponse(prompt, userPhone) {
  let retries = 0;
  let result;

  while (retries < MAX_RETRIES) {
    try {
      console.log(`Tentativa #${retries + 1} para o prompt: ${prompt}`);
      
      // Recupera o histórico recente do usuário
      const recentHistory = await getRecentHistory(userPhone);
      let formattedHistory = recentHistory.reverse().map(msg => 
        formatHistoryMessage(
          msg.role === 'assistant' ? 'model' : 'user',
          msg.content
        )
      );

      // Garante que a primeira mensagem seja sempre do usuário
      if (formattedHistory.length > 0 && formattedHistory[0].role === 'model') {
        formattedHistory = formattedHistory.slice(1);
      }

      const chatSession = model.startChat({
        generationConfig,
        history: formattedHistory,
      });

      // Salva a mensagem do usuário no histórico
      await saveMessage(userPhone, 'user', prompt);

      // Envia a mensagem com quebra de linha no final
      result = await chatSession.sendMessage([
        { text: prompt + '\n' }
      ]);
      const responseText = result.response.text();
      
      // Salva a resposta da IA no histórico
      await saveMessage(userPhone, 'assistant', responseText);
      
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
