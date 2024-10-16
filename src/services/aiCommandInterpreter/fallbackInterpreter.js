import { COMMAND_DESCRIPTIONS } from '../../utils/commandDescriptions.js';

export function fallbackInterpretation(userMessage) {
  const lowerCaseMessage = userMessage.toLowerCase();
  for (const [command, description] of Object.entries(COMMAND_DESCRIPTIONS)) {
    if (lowerCaseMessage.includes(command) || lowerCaseMessage.includes(description.toLowerCase())) {
      return {
        command: command,
        args: [],
        confidence: 70,
        explanation: "Interpretação baseada em palavras-chave"
      };
    }
  }
  return null;
}
