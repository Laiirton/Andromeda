import {
  sendSticker,
  sendImage,
  sendNSFWImage,
} from "../services/mediaService.js";
import { getGeminiResponse } from "../services/googleAIService.js";
import  menu  from "../utils/lang.js";


function getFormattedDateTime() {
  const now = new Date();
  const date = now.toLocaleDateString("pt-BR");
  const time = now.toLocaleTimeString("pt-BR", { hour12: false });
  return `${date} ${time}`;
}

export async function processMessage(client, message) {
  const contact = await message.getContact();
  const senderName = contact.pushname;

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
        throw new Error("O prompt não pode estar vazio.");
      }

      console.log(
        `[${getFormattedDateTime()}] Gerando resposta para o prompt: ${prompt}`
      );
      const response = await getGeminiResponse(prompt);

      console.log(
        `[${getFormattedDateTime()}] Úsuario ${senderName} solicitou uma resposta para o prompt: ${prompt} e recebeu a resposta: ${response}`
      );
      message.reply(response);
    } catch (error) {
      console.error(
        `[${getFormattedDateTime()}] Erro ao gerar resposta: ${error.message}`
      );
      message.reply(
        "Ocorreu um erro inesperado, por favor tente novamente mais tarde."
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

      case "pussy":
        await sendNSFWImage(client, message, senderName, "pussy");
        break;

      case "ass":
        await sendNSFWImage(client, message, senderName, "ass");
        break;

      case "dick":
        await sendNSFWImage(client, message, senderName, "dick");
        break;

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
