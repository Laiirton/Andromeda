import fetch from 'node-fetch';

/**
 * Gera uma resposta usando a API Ollama.
 * @param {string} prompt - O prompt para gerar a resposta.
 * @param {Object} options - Opções adicionais para a geração (opcional).
 * @returns {Promise<string>} A resposta gerada.
 */
export async function ollamaGenerate(prompt, options = {}) {
  const url = 'http://localhost:11434/api/generate';
  const data = {
    model: "porrinha",
    prompt: prompt,
    stream: false,
    ...options
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result.response;
  } catch (error) {
    console.error('Erro ao fazer a requisição:', error);
    throw error;
  }
}

/**
 * Função para melhorar o tratamento de erros e adicionar documentação.
 * @param {string} prompt - O prompt para gerar a resposta.
 * @param {Object} options - Opções adicionais para a geração (opcional).
 * @returns {Promise<string>} A resposta gerada.
 */
export async function generateResponseWithImprovedErrorHandling(prompt, options = {}) {
  try {
    return await ollamaGenerate(prompt, options);
  } catch (error) {
    console.error('Erro ao gerar resposta:', error);
    throw new Error('Ocorreu um erro ao gerar a resposta. Por favor, tente novamente mais tarde.');
  }
}
