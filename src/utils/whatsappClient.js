import pkg from "whatsapp-web.js";
import qrcode from "qrcode-terminal";

const { Client, LocalAuth, MessageMedia } = pkg;

export function initWhatsappClient() {
  const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
      headless: false,
      executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'

    },
  });

  client.on("qr", (qr) => {
    qrcode.generate(qr, { small: true });
  });

  return client;
}