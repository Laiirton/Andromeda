import {
  sendSticker,
  sendImage,
  sendNSFWImage,
  searchRule34,
} from "../services/mediaService.js";
import { getGeminiResponse } from "../services/googleAIService.js";
import { menu, menuNSFW } from "../utils/lang.js";
import { deleteMessage, messageLog } from "../utils/chatTools.js";
import { ollamaGenerate } from "../services/ollama.js";
import { whisperTranscription } from "../services/whisper.js";
import fs from "fs";
import path from "path";


export async function processMessage(client, message) {
  const contact = await message.getContact();
  const senderName = contact.pushname;


  // Save media received
  if (message.hasMedia) {
    try {
      const media = await message.downloadMedia();
  
      // Função para formatar a data no formato dd_mm_yyyy
      function formatDate(date) {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0'); // Mês começa em 0
        const year = date.getFullYear();
        return `${day}_${month}_${year}`;
      }
  
      // 1. Definir a pasta de destino
      const downloadsFolder = path.join('./src/media/');
  
      // 2. Criar a pasta se não existir
      if (!fs.existsSync(downloadsFolder)) {
        fs.mkdirSync(downloadsFolder);
      }
  
      // 3. Criar um nome de arquivo único com data formatada e nome do remetente
      const extension = media.mimetype.split('/')[1];
      const formattedDate = formatDate(new Date());
      const sanitizedSenderName = senderName.replace(/\s+/g, '_'); // Substitui espaços por underscores
      const filename = `media-${formattedDate}-${sanitizedSenderName}-${Date.now()}.${extension}`;
  
      // 4. Caminho completo para salvar o arquivo
      const filePath = path.join(downloadsFolder, filename);
  
      // 5. Converter dados binários para um formato gravável
      const buffer = Buffer.from(media.data, 'base64');
  
      // 6. Gravar o arquivo
      fs.writeFile(filePath, buffer, (err) => {
        if (err) {
          console.error("Erro ao salvar mídia:", err);
        } else {
          console.log(`Mídia salva com sucesso em: ${filePath}`);
        }
      });
  
    } catch (error) {
      console.error("Erro ao baixar mídia:", error);
    }
  }


  // Log the all messages sended
  messageLog(message, senderName);

  // Generative AI Sistem
  if (message.body.toLowerCase().includes("coiso")) {
    try {
      let prompt;
      const quotedMessage = await message.getQuotedMessage();

      if (quotedMessage) {
        prompt =
          quotedMessage.body.trim() +
          " " +
          message.body.replace("coiso", "").trim();
      } else {
        prompt = message.body.replace("coiso", "").trim();
      }

      if (!prompt) {
        message.reply("Oi, você precisa me dizer o que deseja.");

        throw new Error("O prompt não pode estar vazio.");
      }

      console.log(
        `[${new Date().toLocaleString()}] Gerando resposta para o prompt: ${prompt}`
      );
      const response = await getGeminiResponse(prompt);

      console.log(
        `[${new Date().toLocaleString()}] Úsuario ${senderName} solicitou uma resposta para o prompt: ${prompt} e recebeu a resposta: ${response}`
      );
      message.reply(response);
    } catch (error) {
      console.error(
        `[${new Date().toLocaleString()}] Erro ao gerar resposta: ${
          error.message
        }`
      );
    }
  }

  if (message.body.toLowerCase().includes("porrinha")) {
    try {
      let prompt;
      const quotedMessage = await message.getQuotedMessage();

      if (quotedMessage) {
        prompt =
          quotedMessage.body.trim() +
          " " +
          message.body.replace(/porrinha/i, "").trim();
      } else {
        prompt = message.body.replace(/porrinha/i, "").trim();
      }

      if (!prompt) {
        message.reply("Oi, você precisa me dizer o que deseja.");
        throw new Error("O prompt não pode estar vazio.");
      }

      console.log(
        `[${new Date().toLocaleString()}] Gerando resposta para o prompt: ${prompt}`
      );
      const response = await ollamaGenerate(prompt);

      console.log(
        `[${new Date().toLocaleString()}] Úsuario ${senderName} solicitou uma resposta para o prompt: ${prompt} e recebeu a resposta: ${response}`
      );
      message.reply(response);
    } catch (error) {
      console.error(
        `[${new Date().toLocaleString()}] Erro ao gerar resposta: ${
          error.message
        }`
      );
    }
  }

  if (message.body.startsWith("!")) {
    const [command] = message.body.toLowerCase().slice(1).split(" ");

    switch (command) {
      case "transcribe":
        // Baixa a mídia da mensagem e envia para a função do whisper
        const quotedMessage = await message.getQuotedMessage();
        const media = await quotedMessage.downloadMedia();

        // transforma a mídia em buffer e envia para o whisper
        const audioBuffer = Buffer.from(media.data, "base64");
        const transcription = await whisperTranscription(audioBuffer);
        console.log("Transcription result:", transcription);

        // Envia a transcrição para o usuário
        await message.reply(transcription);
        break;

      case "fig":
        await sendSticker(client, message, senderName);
        break;

      case "img":
        await sendImage(client, message);
        break;

      case "delete":
        await deleteMessage(message, senderName);
        break;

      case "pussy":
        await sendNSFWImage(client, message, senderName, "pussy");
        break;

      case "ass":
        await sendNSFWImage(client, message, senderName, "ass");
        break;

      case "dick":
        await sendNSFWImage(client, message, senderName, "dick");
        break;

      case "futa":
        await sendNSFWImage(client, message, senderName, "futa");
        break;

      case "hentai":
        await sendNSFWImage(client, message, senderName, "hentai");
        break;

      case "yaoi":
        await sendNSFWImage(client, message, senderName, "yaoi");
        break;

      case "boobs":
        await sendNSFWImage(client, message, senderName, "boobs");
        break;

      case "gay":
        await sendNSFWImage(client, message, senderName, "gay");
        break;

      case "r34":
        let prompt = message.body.slice(5).trim();
        await searchRule34(client, message, senderName, [prompt]);
        break;

      case "menu":
        message.reply(menu);
        break;

      case "nsfw":
        message.reply(menuNSFW);
        break;

      default:
        message.reply(
          "Invalid command, try !menu to see the available commands."
        );
    }
  }
}
