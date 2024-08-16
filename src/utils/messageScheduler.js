import cron from "node-cron";
import { sendSticker } from "../services/mediaService.js";
import aflb from "aflb";
import pkg from "whatsapp-web.js";
const { MessageMedia } = pkg;

export function initializeMessageScheduler(client) {
  const groupId = "120363186217488014@g.us";

  async function getRandomImageFromCategories(categories) {
    const chosenCategory =
      categories[Math.floor(Math.random() * categories.length)];
    const imageUrl = aflb.sfw[chosenCategory]();

    // Verifica se a URL termina com ".gif" (ou seja, é um GIF)
    if (imageUrl.endsWith(".gif")) {
      // É um GIF, use a função sendSticker
      const media = await MessageMedia.fromUrl(imageUrl);
      return { media, isGif: true };
    } else {
      // É uma imagem estática
      const media = await MessageMedia.fromUrl(imageUrl);
      return { media, isGif: false };
    }
  }

  async function sendMessageToGroup(message) {
    // Envio de mensagem em texto
    await client.sendMessage(groupId, message);
    console.log(`Mensagem enviada para o grupo: ${message}`);

    // Envio de figurinha
    const { media, isGif } = await getRandomImageFromCategories([
      "dance",
      "happy",
      "bored",
      "baka",
      "angry",
      "meow",
      "cry",
    ]);

    if (isGif) {
      // Envia GIF como sticker usando sendSticker
      await sendSticker(client, { from: groupId }, "😈", media); // Adapte para o seu caso
    } else {
      // Envia imagem estática como sticker
      await client.sendMessage(groupId, media, {
        sendMediaAsSticker: true,
        stickerAuthor: "Anjinho Bot",
        stickerName: `Created by Anjinho Bot`, // Adapte para o seu caso
      });
    }
  }

  function scheduleMessages() {
    // 08:00
    cron.schedule("0 8 * * 1-5", () => {
      sendMessageToGroup(
        "Bom dia! Lembrete: Não se esqueça de bater o ponto de entrada. 💀"
      );
    });

    // 12:00
    cron.schedule("0 12 * * 1-5", () => {
      sendMessageToGroup("Hora do almoço! Lembre-se de bater o ponto. 😋");
    });

    // 13:00
    cron.schedule("0 13 * * 1-5", () => {
      sendMessageToGroup(
        "Boa tarde! Não se esqueça de bater o ponto de retorno. 👾"
      );
    });

    // 14:00
    cron.schedule("0 14 * * 1-5", () => {
      sendMessageToGroup("Bata o pontooooooo 🥺");
    });

    // 17:00
    cron.schedule("0 17 * * 1-5", () => {
      sendMessageToGroup("Atenção: Não esqueça do pontooo. 🤟");
    });

    // 18:00
    cron.schedule("0 18 * * 1-5", () => {
      sendMessageToGroup(
        "Não se esqueça de bater o ponto de saída. Bom descanso! 😈"
      );
    });
  }

  return {
    start: scheduleMessages,
  };
}

export async function getGroupList(client) {
  try {
    // Obtém todos os chats
    const chats = await client.getChats();

    // Filtra apenas os grupos
    const groups = chats.filter((chat) => chat.isGroup);

    // Mapeia os grupos para um array de objetos com nome e id
    const groupList = groups.map((group) => ({
      name: group.name,
      id: group.id._serialized,
    }));

    return groupList;
  } catch (error) {
    console.error("Erro ao obter lista de grupos:", error);
    return [];
  }
}

export async function printGroupList(client) {
  const groups = await getGroupList(client);

  console.log("Lista de Grupos:");
  groups.forEach((group) => {
    console.log(`Nome: ${group.name}`);
    console.log(`ID: ${group.id}`);
    console.log("---");
  });
}
