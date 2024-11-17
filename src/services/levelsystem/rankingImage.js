import pkg from 'whatsapp-web.js';
const { MessageMedia } = pkg;

async function createRankingImage(topUsers) {
  // Temporarily disabled image generation
  let message = "🏆 *Ranking dos Maiores Poggers* 🏆\n\n";
  
  topUsers.forEach((user, i) => {
    message += `${i + 1}. ${user.username}\n`;
    message += `   Nível: ${user.level} | XP: ${user.xp} | Mensagens: ${user.messages_sent}\n\n`;
  });
  
  return message;
}

export async function generateRankingImage(topUsers) {
  try {
    const message = await createRankingImage(topUsers);
    return message;
  } catch (error) {
    console.error('Erro ao gerar imagem de ranking:', error);
    throw error;
  }
}