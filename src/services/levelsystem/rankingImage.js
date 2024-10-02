import { createCanvas, loadImage, registerFont } from 'canvas';
import pkg from 'whatsapp-web.js';
const { MessageMedia } = pkg;
import fs from 'fs/promises';
import path from 'path';

// Tenta registrar a fonte, mas não falha se não conseguir
try {
  registerFont(path.join(process.cwd(), 'src/assets/fonts/Roboto-Bold.ttf'), { family: 'Roboto' });
} catch (error) {
  console.warn('Aviso: Não foi possível carregar a fonte Roboto-Bold. Usando fonte padrão.');
}

async function createRankingImage(topUsers) {
  const canvas = createCanvas(800, 600);
  const ctx = canvas.getContext('2d');

  // Fundo
  ctx.fillStyle = '#2C2F33';
  ctx.fillRect(0, 0, 800, 600);

  // Título
  ctx.font = 'bold 40px Roboto, sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.fillText('OS MAIORES POGGERS DO GRUPO', 400, 50);

  // Carregar imagem de troféu
  let trophyImage;
  try {
    trophyImage = await loadImage(path.join(process.cwd(), 'src/assets/images/trophy.png'));
  } catch (error) {
    console.warn('Aviso: Não foi possível carregar a imagem do troféu.');
  }

  for (let i = 0; i < topUsers.length; i++) {
    const user = topUsers[i];
    const yPos = 120 + i * 90;

    // Fundo do usuário
    ctx.fillStyle = i % 2 === 0 ? '#23272A' : '#2C2F33';
    ctx.fillRect(50, yPos, 700, 80);

    // Carregar avatar do usuário (ou usar um padrão se não disponível)
    let avatarImage;
    try {
      avatarImage = await loadImage(user.avatarUrl || path.join(process.cwd(), 'src/assets/images/default-avatar.png'));
    } catch (error) {
      console.warn(`Aviso: Não foi possível carregar o avatar para ${user.username}. Usando retângulo colorido.`);
      avatarImage = null;
    }

    // Desenhar avatar ou retângulo colorido
    ctx.save();
    ctx.beginPath();
    ctx.arc(100, yPos + 40, 30, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();
    if (avatarImage) {
      ctx.drawImage(avatarImage, 70, yPos + 10, 60, 60);
    } else {
      ctx.fillStyle = `hsl(${Math.random() * 360}, 100%, 50%)`;
      ctx.fillRect(70, yPos + 10, 60, 60);
    }
    ctx.restore();

    // Informações do usuário
    ctx.font = 'bold 24px Roboto, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'left';
    ctx.fillText(`${i + 1}. ${user.username}`, 150, yPos + 30);

    ctx.font = '18px Roboto, sans-serif';
    ctx.fillStyle = '#B9BBBE';
    ctx.fillText(`Nível: ${user.level} | XP: ${user.xp} | Mensagens: ${user.messages_sent}`, 150, yPos + 60);

    // Troféu para o top 1
    if (i === 0 && trophyImage) {
      ctx.drawImage(trophyImage, 650, yPos + 15, 50, 50);
    }
  }

  return canvas.toBuffer('image/png');
}

export async function generateRankingImage(topUsers) {
  try {
    const buffer = await createRankingImage(topUsers);
    return new MessageMedia('image/png', buffer.toString('base64'), 'ranking.png');
  } catch (error) {
    console.error('Erro ao gerar imagem de ranking:', error);
    throw error;
  }
}