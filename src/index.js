import { initWhatsappClient } from "./utils/whatsappClient.js";
import { processMessage } from "./controllers/messageController.js";

// Inicialize o cliente do WhatsApp
const client = initWhatsappClient();

// Quando o cliente estiver pronto
client.on("ready", () => {
  console.log("Cliente está pronto!");
});

// Quando uma mensagem é recebida
client.on("message", async (message) => {
  try {
    // Processa a mensagem
    await processMessage(client, message);
  } catch (error) {
    // Loga qualquer erro que ocorra durante o processamento da mensagem
    console.error(`Erro ao processar a mensagem: ${error}`);
  }
});

// Quando o cliente é desconectado
client.on("disconnected", (reason) => {
  console.log(`Cliente foi desconectado, motivo: ${reason}. Reconectando...`);
  client.initialize();
});

// Quando ocorre um erro
client.on("error", (error) => {
  console.error(`Erro no cliente: ${error}`);
});

// Inicializa o cliente
client.initialize();