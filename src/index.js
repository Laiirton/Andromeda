import pkg from "whatsapp-web.js";
import qrcode from "qrcode-terminal";
import { processMessage } from "./controllers/messageController.js";
import { initializeMessageScheduler } from "./utils/messageScheduler.js";

const { Client, LocalAuth } = pkg;

function initWhatsappClient() {
  const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
      headless: false,
      executablePath : "C:/Program Files/Google/Chrome/Application/chrome.exe",
      args: [
        '--window-position=-1000,-1000'
      ]
    },
  });

  client.on("qr", (qr) => {
    qrcode.generate(qr, { small: true });
  });

  return client;
}

const client = initWhatsappClient();
const messageScheduler = initializeMessageScheduler(client);

client.on("ready", () => {
  console.log("Client is ready!");
  messageScheduler.start(); 
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