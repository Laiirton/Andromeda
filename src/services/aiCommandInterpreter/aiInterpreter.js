import { getGeminiResponse } from '../googleAIService.js';
import { COMMAND_DESCRIPTIONS } from '../../utils/commandDescriptions.js';
import NodeCache from 'node-cache';
import { fallbackInterpretation } from './fallbackInterpreter.js';
import fs from 'fs';

const responseCache = new NodeCache({ stdTTL: 3600 }); // Cache por 1 hora

function logAPIUsage() {
  const timestamp = new Date().toISOString();
  fs.appendFile('api_usage.log', `${timestamp}: API call made\n`, (err) => {
    if (err) console.error('Erro ao registrar uso da API:', err);
  });
}

export async function interpretUserIntent(userMessage) {
  const cacheKey = userMessage.toLowerCase().trim();
  const cachedResponse = responseCache.get(cacheKey);
  
  if (cachedResponse) {
    console.log("Usando resposta em cache");
    return cachedResponse;
  }

  const prompt = `
    Você é um assistente especializado em interpretar mensagens de usuários e mapear para comandos de um bot de WhatsApp.
    Aqui estão os comandos disponíveis e suas descrições:

    ${Object.entries(COMMAND_DESCRIPTIONS).map(([cmd, desc]) => `${cmd}: ${desc}`).join('\n')}

    Mensagem do usuário: "${userMessage}"

    Com base na mensagem do usuário, determine:
    1. Qual comando mais se aproxima da intenção do usuário?
    2. Quais argumentos, se houver, devem ser passados para esse comando?
    3. Qual é a confiança (em porcentagem) de que esta interpretação está correta?

    Mesmo que a mensagem seja ambígua, tente inferir o comando mais provável baseado no contexto.
    Se a mensagem for "sim" ou similar, considere-a como uma confirmação para o último comando sugerido.

    Responda APENAS no seguinte formato JSON, sem nenhum texto adicional:
    {
      "command": "nome_do_comando",
      "args": ["arg1", "arg2"],
      "confidence": 85,
      "explanation": "Breve explicação da sua interpretação"
    }

    Se nenhum comando corresponder, use "command": null.
  `;

  try {
    const response = await getGeminiResponse(prompt);
    logAPIUsage();
    console.log("Resposta bruta da IA:", response);

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const jsonString = jsonMatch[0];
      console.log("JSON extraído:", jsonString);
      const parsedResponse = JSON.parse(jsonString);
      responseCache.set(cacheKey, parsedResponse);
      return parsedResponse;
    } else {
      console.error("Nenhum JSON válido encontrado na resposta");
      return null;
    }
  } catch (error) {
    console.error('Erro ao interpretar intenção do usuário:', error);
    console.log('Usando interpretação de fallback');
    return fallbackInterpretation(userMessage);
  }
}
