import {
  sendSticker,
  sendImage,
  sendNSFWImage,
} from "../services/mediaService.js";
import { getGeminiResponse } from "../services/googleAIService.js";
import  menu  from "../utils/lang.js";
import { deleteMessage, messageLog } from "../utils/chatTools.js";


export async function processMessage(client, message) {
  const contact = await message.getContact();
  const senderName = contact.pushname;

  // Log the all messages sended 
  messageLog(message, senderName);

  // Generative AI Sistem
  if (message.body.startsWith("coiso")) {
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
        `[${new Date().toLocaleString()}] Erro ao gerar resposta: ${error.message}`
      );
    }
  }

  if (message.body.startsWith("!")) {
    const [command] = message.body.toLowerCase().slice(1).split(" ");

    switch (command) {
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
        break

      case "boobs":
          await sendNSFWImage(client, message, senderName, "boobs");
          break

      case "gay":
          await sendNSFWImage(client, message, senderName, "gay");
          break
        
      

      case "menu":
        message.reply(menu);
        break;

      default:
        message.reply(
          "Invalid command, try !menu to see the available commands."
        );
    }
  }
}
