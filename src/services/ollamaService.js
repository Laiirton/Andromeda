class OllamaService {
  constructor() {
    this.baseUrl = 'http://localhost:11434/api';
    this.defaultModel = 'hf.co/RichardErkhov/trollek_-_Qwen2-1.5B-Instruct-Abliterated-gguf:IQ3_S';
  }

  async generateCompletion(prompt, options = {}) {
    try {
      const response = await fetch(`${this.baseUrl}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.defaultModel,
          prompt,
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
      const response = await fetch(`${this.baseUrl}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.defaultModel,
          messages,
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
