import { initWhatsappClient } from "./utils/whatsappClient.js";
import { processMessage } from "./controllers/messageController.js";

const client = initWhatsappClient();

client.on("ready", () => {
  console.log("Cliente está pronto!");
});

client.on("message", async (message) => {
  try {
    await processMessage(client, message);
  } catch (error) {
    console.error(`Erro ao processar a mensagem: ${error}`);
  }
});

client.on("auth_failure", () => {
  console.error("Falha de autenticação. Verifique suas credenciais.");
});

client.on("disconnected", (reason) => {
  console.log(`Cliente foi desconectado, motivo: ${reason}. Reconectando...`);
  client.initialize();
});

client.on("change_state", (state) => {
  console.log(`O estado do cliente mudou para: ${state}`);
});

client.on("qr", (qr) => {
  console.log(`QR recebido, escaneie para conectar: ${qr}`);
});

client.on("message_ack", (message, ack) => {
  console.log(`Mensagem ${message.id} foi ${ack}`);
});

client.on("error", (error) => {
  console.error(`Erro no cliente: ${error}`);
});

client.initialize();