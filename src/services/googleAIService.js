// Import modules
import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";
import { GoogleAIFileManager } from "@google/generative-ai/files";
import fs from "fs";
import dotenv from "dotenv";
dotenv.config();

// Environment variables
const apiKey = process.env.GOOGLE_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash-002",
  systemInstruction: ``,
});

const generationConfig = {
  temperature: 0.8,
  topP: 0.95,
  topK: 40, // Alterado de 64 para 40, que está dentro do intervalo suportado (1 a 40)
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
      console.log(`Solicitação bem-sucedida na tentativa #${retries + 1}!`);
      break; // se a solicitação for bem-sucedida, saia do loop
    } catch (error) {
      retries++;
      console.log(`Erro na tentativa #${retries}: ${error.message}`);
      if (retries === MAX_RETRIES) {
        throw error; // se atingir o número máximo de tentativas, lance o erro
      }
      console.error(
        `Error: ${error.message}, retrying in ${RETRY_DELAY / 1000} seconds...`
      );
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY)); // aguarde antes de tentar novamente
    }
  }

  return result.response.text();
}

// Função para transcrever audios em texto e enviar para o usuário
export async function getGeminiTranscribe(message) {
  const fileManager = new GoogleAIFileManager(apiKey);

  try {
    let mediaMessage = message;

    if (message.hasQuotedMsg) {
      mediaMessage = await message.getQuotedMessage();
    }
  
    mediaMessage = await mediaMessage.downloadMedia();
  
    fs.writeFileSync("./src/media/audio.ogg", mediaMessage.data, {
      encoding: "base64",
    });
    console.log("Arquivo de áudio salvo com sucesso!");
  
    const audioMessage = "./src/media/audio.ogg";
  
    const audioUpload = await fileManager.uploadFile(audioMessage, {
      mimeType: "audio/ogg",
      displayName: "WhatsApp Audio Message",
    });
  
    console.log(`Audio uploaded: ${audioUpload.file.uri}`);

    // Verificar se o arquivo está pronto para transcrição
    let file = await fileManager.getFile(audioUpload.file.name);
    while (file.state === 'PROCESSING'){
      console.log('Arquivo em processamento...')
      await new Promise((resolve)=> setTimeout(resolve, 10000));
      file = await fileManager.getFile(audioUpload.file.name);
    }

    if (file.state === 'FAILED'){
      throw new Error('Falha ao processar o arquivo de áudio');
    }

    const result = await model.generateContent([
      {
        fileData: {
          mimeType: audioUpload.file.mimeType,
          fileUri: audioUpload.file.uri,
        },
      },
      { text: 'Transcreva este áudio.' },
    ]);

    console.log('Transcrição:', result.response.text())

    await fileManager.deleteFile(audioUpload.file.name);
    console.log('Arquivo de áudio deletado com sucesso!')

    
  } catch (error) {
    console.log(" Error ao transcrever: ", error)
  }
  
}