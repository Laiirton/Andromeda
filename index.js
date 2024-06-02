import pkg from "whatsapp-web.js";
import qrcode from "qrcode-terminal";
import { NSFW } from "nsfwhub";

//library
const { Client, LocalAuth, MessageMedia } = pkg;
const nsfw = new NSFW();


const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    executablePath: "/usr/bin/google-chrome",
    headless: true,

  }
});

client.on("ready", () => {
  console.log("Cliente está pronto!");
});

client.on("qr", (qr) => {
  qrcode.generate(qr, { small: true });
});

client.on("message", async (message) => {
  if (message.body.startsWith("!")) {
    const [command, ...queryWords] = message.body
      .toLowerCase()
      .slice(1)
      .split(" ");

    const query = queryWords.join(" ");
    const contact = await message.getContact();
    const senderName = contact.pushname;

    switch (command) {
      case "fig":
        try {
          let mediaMessage = message;
          if (message.hasQuotedMsg) {
            mediaMessage = await message.getQuotedMessage();
          }
          if (mediaMessage.hasMedia) {
            const media = await mediaMessage.downloadMedia();
            await client.sendMessage(message.from, media, {
              sendMediaAsSticker: true,
              stickerAuthor: "Anjinho Bot ",
              stickerName: `Create by ${senderName}`,
            });
          }
          console.log(`Sticker sent to ${senderName}`);
        } catch (error) {
          console.error(error);
          message.reply("Failed to fetch image.");
        }
        break;

      case "img":
        let figbase = message;
        if (message.hasQuotedMsg) {
          figbase = await message.getQuotedMessage();
        }
        if (figbase.hasMedia) {
          const media = await figbase.downloadMedia();
          await client.sendMessage(message.from, media);
        }
        break;

      case "pussy":
        try {
          const pussy = await nsfw.fetch("pussy");
          const pussypic = pussy.image.url;
          const pussypicc = await MessageMedia.fromUrl(pussypic);
          await client.sendMessage(message.from, pussypicc);
          console.log(`Pussy image sent to ${senderName}`);
        } catch (error) {
          console.error(error);
          message.reply("Failed to fetch image.");
        }
        break;

      case "ass":
        try {
          const ass = await nsfw.fetch("ass");
          const assp = ass.image.url;
          const asspic = await MessageMedia.fromUrl(assp);
          await client.sendMessage(message.from, asspic);
          console.log(`Ass image sent to ${senderName}`);
        } catch (error) {
          console.error(error);
          message.reply("Failed to fetch image.");
        }

        break;

      case "dick":
        try {
          const dick = await nsfw.fetch("dick");
          const dickp = dick.image.url;
          const dickpic = await MessageMedia.fromUrl(dickp);
          await message.reply(dickpic, message.from);
          console.log(`Dick image sent ${senderName}`);
        } catch (error) {
          console.error(error);
          message.reply("Failed to fetch image.");
        }
        break;

      case "menu":
        message.reply(`
          *Comandos disponíveis:*
          
          *!fig* - Cria uma figurinha a partir de uma imagem. Responda a uma imagem com este comando.
          *!img* - Envia a imagem original de uma figurinha. Responda a uma figurinha com este comando.
        `);
        break;

      default:
        message.reply(
          "Invalid command, try !menu to see the available commands."
        );
    }
  }
});

client.initialize();
