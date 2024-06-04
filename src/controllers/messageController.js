import { sendSticker, sendImage, sendNSFWImage } from "../services/mediaService.js";
import { getGeminiResponse } from "../services/googleAIService.js";

export async function processMessage(client, message) {
  const contact = await message.getContact();
  const senderName = contact.pushname;


  if (message.body.startsWith("coiso")) {
    try {
      let prompt;
      const quotedMessage = await message.getQuotedMessage();
      
      if (quotedMessage) {
        // Se houver uma mensagem marcada, use o texto da mensagem marcada
        prompt = quotedMessage.body.trim() + " " + message.body.replace("coiso", "").trim();
      } else {
        // Se não houver mensagem marcada, use apenas o texto após "coiso"
        prompt = message.body.replace("coiso", "").trim();
      }
  
      console.log(`${senderName} enviou o seguinte prompt para o Google AI: ${prompt}`);
      const response = await getGeminiResponse(prompt);
      console.log(`Resposta do Google AI para ${senderName}: ${response}`);
      message.reply(response);
    } catch (error) {
      console.error(error);
      message.reply("Failed to generate response, try again.");
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
        message.reply("Invalid command, try !menu to see the available commands.");
    }
  }
}