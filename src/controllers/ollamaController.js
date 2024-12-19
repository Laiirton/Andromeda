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
}

export default OllamaController;
