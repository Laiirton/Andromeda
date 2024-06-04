import pkg from "whatsapp-web.js";
import qrcode from "qrcode-terminal";

const { Client, LocalAuth } = pkg;

export function initWhatsappClient() {
  const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
      headless: false,
    },
  });

  client.on("qr", (qr) => {
    qrcode.generate(qr, { small: true });
  });

  return client;
}