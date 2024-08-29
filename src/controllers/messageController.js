import {
  sendSticker,
  sendImage,
  sendNSFWImage,
  searchRule34,
} from "../services/mediaService.js";
import { getGeminiResponse } from "../services/googleAIService.js";
import { menu, menuNSFW } from "../utils/lang.js";
import { deleteMessage, messageLog, printGroupList } from "../utils/chatTools.js";
import { ollamaGenerate } from "../services/ollama.js";
import { whisperTranscription } from "../services/whisper.js";



export async function processMessage(client, message) {
  const contact = await message.getContact();
  const senderName = contact.pushname;

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
      case "groups":
        await printGroupList(client);
        break
      default:
        message.reply(
          "Invalid command, try !menu to see the available commands."
        );
    }
  }
}
