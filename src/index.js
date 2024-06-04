import { initWhatsappClient } from "./utils/whatsappClient.js";
import { processMessage } from "./controllers/messageController.js";


const client = initWhatsappClient();

client.on("ready", () => {
  console.log("Cliente está pronto!");
});

client.on("message", async (message) => {
  await processMessage(client, message);
});

client.initialize();