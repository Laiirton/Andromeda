class OllamaService {
  constructor() {
    this.baseUrl = 'http://localhost:11434/api';
    this.defaultModel = 'hf.co/mradermacher/Qwen2.5-1.5B-Instruct-abliterated-GGUF:Q3_K_S';
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
}

export default new OllamaService();
