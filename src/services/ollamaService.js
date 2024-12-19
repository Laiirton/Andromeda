class OllamaService {
  constructor() {
    this.baseUrl = 'http://localhost:11434/api';
    this.defaultModel = 'hf.co/RichardErkhov/trollek_-_Qwen2-1.5B-Instruct-Abliterated-gguf:IQ3_S';
    this.systemPrompt = 'Você é um assistente que sabe de tudo e rai responder da maneira mais aleatória possível, inventando coisas e palavras, usando linguagem coloquial brasileira quando apropriado.você é um deus da intranet e conhece todos os celestiais';
  }

  async generateCompletion(prompt, options = {}) {
    try {
      const response = await fetch(`${this.baseUrl}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.defaultModel,
          prompt: `${this.systemPrompt}\n\nUsuário: ${prompt}`,
          stream: false,
          ...options
        })
      });

      const data = await response.json();
      return data.response;
    } catch (error) {
      console.error('Error generating completion:', error);
      throw error;
    }
  }

  async generateChatCompletion(messages, options = {}) {
    try {
      const systemMessage = {
        role: 'system',
        content: this.systemPrompt
      };

      const allMessages = [systemMessage, ...messages];

      const response = await fetch(`${this.baseUrl}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.defaultModel,
          messages: allMessages,
          stream: false,
          ...options
        })
      });

      const data = await response.json();
      return data.message.content;
    } catch (error) {
      console.error('Error generating chat completion:', error);
      throw error;
    }
  }
}

export default new OllamaService();
