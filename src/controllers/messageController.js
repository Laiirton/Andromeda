import {
  sendSticker,
  sendImage,
  sendNSFWImage,
} from "../services/mediaService.js";
import { getGeminiResponse } from "../services/googleAIService.js";
import MarkdownIt from "markdown-it";

export async function processMessage(client, message) {
  const contact = await message.getContact();
  const senderName = contact.pushname;
  const md = new MarkdownIt();

  if (message.body.startsWith("coiso")) {
    try {
      let prompt;
      const quotedMessage = await message.getQuotedMessage();

      if (quotedMessage) {
        // Se houver uma mensagem marcada, use o texto da mensagem marcada
        prompt =
          quotedMessage.body.trim() + " " + message.body.replace("coiso", "").trim();
      } else {
        // Se não houver mensagem marcada, use apenas o texto após "coiso"
        prompt = message.body.replace("coiso", "").trim();
      }

      const MAX_RETRIES = 3;
      const RETRY_DELAY = 10000;
      let retries = 0;
      let response;

      while (retries < MAX_RETRIES) {
        try {
          console.log(`Attempt #${retries + 1} for prompt: ${prompt}`);
          response = await getGeminiResponse(prompt);
          console.log(`Request successful on attempt #${retries + 1}!`);
          break;
        } catch (error) {
          retries++;
          console.log(`Error on attempt #${retries}: ${error.message}`);
          if (retries === MAX_RETRIES) {
            message.reply("Failed to generate response, try again.");
            return;
          }
          console.error(
            `Error: ${error.message}, retrying in ${
              RETRY_DELAY / 1000
            } seconds...`
          );
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
        }
      }

      const renderedResponse = md.render(response);
      console.log(`Response generated for ${senderName}: ${renderedResponse}`);
      message.reply(renderedResponse);
    } catch (error) {
      console.error(error);
      message.reply("An unexpected error occurred, please try again later.");
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
        message.reply(`
          *Comandos disponíveis:*
          
          *!fig* - Cria uma figurinha a partir de uma imagem. Responda a uma imagem com este comando.
          *!img* - Envia a imagem original de uma figurinha. Responda a uma figurinha com este comando.
        `);
        break;

      default:
        message.reply(
          "Invalid command, try !menu to see the available commands."
        );
    }
  }
}
