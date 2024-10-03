import { GoogleGenerativeAI } from "@google/generative-ai";
import { getRecentMessages } from "./messageStore.js";
import { isRandomChatActive } from "./randomChatState.js";

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash-002",
});

const generationConfig = {
  temperature: 0.9,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 256,
};

async function generateRandomResponse(groupId) {
  if (!isRandomChatActive(groupId)) {
    return null;
  }

  const recentMessages = await getRecentMessages(groupId, 10);
  if (recentMessages.length === 0) {
    return null;
  }

  const chatSession = model.startChat({ generationConfig });

  // Adicionar contexto inicial
  await chatSession.sendMessage(`Você é um participante casual em um grupo de chat. Responda de forma natural e contextualizada, como se fosse parte da conversa. Não mencione que você é uma IA. Use um tom informal e amigável, adequado para uma conversa de grupo. Baseie-se no contexto das mensagens recentes para sua resposta.`);

  // Adicionar mensagens recentes ao histórico
  const context = recentMessages.map(msg => `${msg.sender}: ${msg.text}`).join("\n");
  await chatSession.sendMessage(context);

  // Gerar resposta
  const result = await chatSession.sendMessage("Com base nessa conversa, como você responderia de forma natural e contextualizada?");
  return result.response.text();
}

export { generateRandomResponse };