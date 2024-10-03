import { generateRandomResponse } from "./randomChatService.js";
import { storeMessage } from "./messageStore.js";
import { isRandomChatActive, toggleRandomChat } from "./randomChatState.js";

async function handleRandomChat(message) {
  const chat = await message.getChat();
  if (!chat.isGroup) {
    await message.reply("Este comando só pode ser usado em grupos.");
    return;
  }

  const isActive = await toggleRandomChat(chat.id._serialized);
  const status = isActive ? "ativado" : "desativado";
  await message.reply(`O chat aleatório foi ${status} para este grupo.`);
}

async function processRandomChat(client, message, chat) {
  const sender = message.author ? (await message.getContact()).pushname : 'Desconhecido';
  storeMessage(chat.id._serialized, message.body, sender);

  const isActive = await isRandomChatActive(chat.id._serialized);
  if (!isActive) {
    return;
  }

  // Chance de 50% de gerar uma resposta
  if (Math.random() < 0.5) {
    const response = await generateRandomResponse(chat.id._serialized);
    if (response) {
      // Simular digitação para parecer mais natural
      await chat.sendStateTyping();
      
      // Esperar um tempo aleatório entre 2 e 5 segundos
      await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
      
      await client.sendMessage(chat.id._serialized, response);
    }
  }
}

export { handleRandomChat, processRandomChat };