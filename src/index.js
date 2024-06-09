import { initWhatsappClient } from "./utils/whatsappClient.js";
import { processMessage } from "./controllers/messageController.js";

const client = initWhatsappClient();

client.on("ready", () => {
  console.log("Client is ready!");
});

client.on("message", async (message) => {
  try {
    await processMessage(client, message);
  } catch (error) {
    console.error(`Error processing message: ${error}`);
  }
});


client.on("auth_failure", () => {
  console.error("Authentication failure. Check your credentials.");
});

client.on("disconnected", (reason) => {
  console.log(`Client was disconnected, reason: ${reason}. Reconnecting...`);
  client.initialize();
});

client.on("change_state", (state) => {
  console.log(`Client state changed to: ${state}`);
});

client.on("qr", (qr) => {
  console.log(`QR received, scan to connect: ${qr}`);
});

client.on("error", (error) => {
  console.error(`Client error: ${error}`);
});

client.initialize();