import cron from "node-cron";
import { getRandomGif, getRandomImage } from "../services/mediaService.js";

export function initializeMessageScheduler(client) {
  const groupId = "120363186217488014@g.us";

  async function sendMessageToGroup(message) {
    try {
      await client.sendMessage(groupId, message);
      console.log(`Mensagem enviada para o grupo: ${message}`);

      // Envio de figurinhas kawaii 
      const stickerMedia = await getRandomGif();

      await client.sendMessage(groupId, stickerMedia, {
        sendMediaAsSticker: true,
        stickerAuthor: "Anjinho Bot",
        stickerName: `Created by 😈`,
      });
    } catch (error) {
      console.error(`Erro ao enviar mensagem para o grupo: ${error.message}`);
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
      sendMessageToGroup(
        "Bata o pontooooooo 🥺"
      );
    });

    // 17:00
    cron.schedule("0 17 * * 1-5", () => {
      sendMessageToGroup(
        "Atenção: Falta uma hora para o fim do expediente. Prepare-se para bater o ponto de saída em breve. 🤟"
      );
    });

    // 18:00
    cron.schedule("0 18 * * 1-5", () => {
      sendMessageToGroup(
        "Fim do expediente! Não se esqueça de bater o ponto de saída. Bom descanso! 😈"
      );
    });
  }

  return {
    start: scheduleMessages,
  };
}

