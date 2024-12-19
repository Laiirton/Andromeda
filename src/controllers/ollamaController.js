import ollamaService from '../services/ollamaService.js';

class OllamaController {
  static async handleCompletion(message, prompt) {
    try {
      const response = await ollamaService.generateCompletion(prompt);
      await message.reply(response);
    } catch (error) {
      console.error('Error handling completion:', error);
      await message.reply('Desculpe, ocorreu um erro ao processar sua solicitação.');
    }
  }

  static async handleChat(message, userMessage) {
    try {
      const messages = [
        {
          role: 'user',
          content: userMessage
        }
      ];

      const response = await ollamaService.generateChatCompletion(messages);
      await message.reply(response);
    } catch (error) {
      console.error('Error handling chat:', error);
      await message.reply('Desculpe, ocorreu um erro ao processar sua solicitação.');
    }
  }

  static async handleImageChat(message, userMessage, images) {
    try {
      const messages = [
        {
          role: 'user',
          content: userMessage,
          images: images
        }
      ];

      const response = await ollamaService.generateChatCompletion(messages);
      await message.reply(response);
    } catch (error) {
      console.error('Error handling image chat:', error);
      await message.reply('Desculpe, ocorreu um erro ao processar sua solicitação com imagem.');
    }
  }

  static async handleStructuredChat(message, userMessage, schema) {
    try {
      const messages = [
        {
          role: 'user',
          content: userMessage
        }
      ];

      const response = await ollamaService.generateChatCompletion(messages, {
        format: schema
      });

      await message.reply(response);
    } catch (error) {
      console.error('Error handling structured chat:', error);
      await message.reply('Desculpe, ocorreu um erro ao processar sua solicitação estruturada.');
    }
  }
}

export default OllamaController;
