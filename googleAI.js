import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

const apiKey = "AIzaSyCem06DOhmjJxz9qireL64r4Nt8L3lyVk0";
const genAI = new GoogleGenerativeAI(apiKey);

const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
});

const generationConfig = {
  temperature: 1,
  topP: 0.95,
  topK: 64,
  maxOutputTokens: 8192,
  responseMimeType: "text/plain",
};

const MAX_RETRIES = 3; // número máximo de tentativas
const RETRY_DELAY = 10000; // atraso em milissegundos entre as tentativas

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
      console.log(`Solicitação bem-sucedida na tentativa #${retries + 1}!`)
      break; // se a solicitação for bem-sucedida, saia do loop
    } catch (error) {
      retries++;
      console.log(`Erro na tentativa #${retries}: ${error.message}`)
      if (retries === MAX_RETRIES) {
        throw error; // se atingir o número máximo de tentativas, lance o erro
      }
      console.error(`Error: ${error.message}, retrying in ${RETRY_DELAY / 1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY)); // aguarde antes de tentar novamente
    }
  }

  return result.response.text();
}