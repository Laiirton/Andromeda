import pkg from 'whatsapp-web.js';
const { MessageMedia } = pkg;
import { getUserLevel, getTopUsers, isLevelSystemActive, toggleLevelSystem } from './database.js';
import { calculateXPForNextLevel, formatNumber } from './utils.js';

export async function handleLevelCommand(message) {
  const chat = await message.getChat();
  if (!chat.isGroup) {
    await message.reply("Este comando só pode ser usado em grupos.");
    return;
  }

  if (!await isLevelSystemActive(chat.id._serialized)) {
    await message.reply("O sistema de níveis não está ativo neste grupo. Use !levelsystem on para ativar.");
    return;
  }

  const phoneNumber = message.author || message.from.split('@')[0];
  const userLevel = await getUserLevel(phoneNumber, chat.id._serialized);
  if (!userLevel) {
    await message.reply("Não foi possível encontrar suas informações de nível. Por favor, envie algumas mensagens e tente novamente.");
    return;
  }

  const nextLevelXP = calculateXPForNextLevel(userLevel.level);
  const xpNeeded = nextLevelXP - userLevel.xp;

  await message.reply(
    `📊 *Suas Estatísticas*\n\n` +
    `👤 Nome: ${userLevel.username}\n` +
    `🏆 Nível: ${userLevel.level}\n` +
    `✨ XP: ${formatNumber(userLevel.xp)}\n` +
    `📨 Mensagens enviadas: ${formatNumber(userLevel.messages_sent)}\n` +
    `📈 XP para o próximo nível: ${formatNumber(xpNeeded)}\n\n` +
    `Continue interagindo para subir de nível!`
  );
}

export async function handleRankCommand(message) {
  const chat = await message.getChat();
  if (!chat.isGroup) {
    await message.reply("Este comando só pode ser usado em grupos.");
    return;
  }

  if (!await isLevelSystemActive(chat.id._serialized)) {
    await message.reply("O sistema de níveis não está ativo neste grupo. Use !levelsystem on para ativar.");
    return;
  }

  const topUsers = await getTopUsers(chat.id._serialized, 10);
  if (topUsers.length === 0) {
    await message.reply("Ainda não há usuários ranqueados neste grupo.");
    return;
  }

  let rankMessage = "🏆 *Top 10 Usuários do Grupo* 🏆\n\n";
  topUsers.forEach((user, index) => {
    rankMessage += `${index + 1}. ${user.username}\n`;
    rankMessage += `   Nível: ${user.level} | XP: ${formatNumber(user.xp)}\n\n`;
  });

  await message.reply(rankMessage);
}

export async function handleTopRankCommand(client, message) {
  const chat = await message.getChat();
  if (!chat.isGroup) {
    await message.reply("Este comando só pode ser usado em grupos.");
    return;
  }

  if (!await isLevelSystemActive(chat.id._serialized)) {
    await message.reply("O sistema de níveis não está ativo neste grupo. Use !levelsystem on para ativar.");
    return;
  }

  const topUsers = await getTopUsers(chat.id._serialized, 5);
  if (topUsers.length === 0) {
    await message.reply("Ainda não há usuários ranqueados neste grupo.");
    return;
  }

  let rankMessage = "🏆 *Top 5 Usuários do Grupo* 🏆\n\n";
  
  for (let i = 0; i < topUsers.length; i++) {
    const user = topUsers[i];
    const contact = await client.getContactById(user.phone_number);
    
    rankMessage += `${i + 1}. *${user.username}*\n`;
    rankMessage += `   Nível: ${user.level} | XP: ${formatNumber(user.xp)}\n`;
    rankMessage += `   Mensagens enviadas: ${formatNumber(user.messages_sent)}\n\n`;

    try {
      const profilePic = await contact.getProfilePicUrl();
      if (profilePic) {
        const media = await MessageMedia.fromUrl(profilePic);
        await message.reply(media, message.from, { caption: `Foto de perfil de ${user.username}` });
      }
    } catch (error) {
      console.error(`Erro ao obter foto de perfil de ${user.username}:`, error);
    }
  }

  await message.reply(rankMessage);
}

export async function handleLevelSystemToggle(message, args) {
  const chat = await message.getChat();
  if (!chat.isGroup) {
    await message.reply("Este comando só pode ser usado em grupos.");
    return;
  }

  if (!args[0] || (args[0] !== 'on' && args[0] !== 'off')) {
    await message.reply("Uso correto: !levelsystem [on/off]");
    return;
  }

  const isActive = args[0] === 'on';
  const result = await toggleLevelSystem(chat.id._serialized, isActive);

  if (result !== null) {
    await message.reply(`Sistema de níveis ${isActive ? 'ativado' : 'desativado'} para este grupo.`);
  } else {
    await message.reply("Ocorreu um erro ao alterar o status do sistema de níveis.");
  }
}