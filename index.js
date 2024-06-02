import pkg from "whatsapp-web.js";
import qrcode from "qrcode-terminal";
import { NSFW } from "nsfwhub";
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

const { Client, LocalAuth, MessageMedia } = pkg;
const nsfw = new NSFW();


// AI GOOGLE API
const apiKey = "AIzaSyCem06DOhmjJxz9qireL64r4Nt8L3lyVk0";
const genAI = new GoogleGenerativeAI(apiKey);

const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
});

const generationConfig = {
  temperature: 1,
  topP: 0.95,
  topK: 64,
  maxOutputTokens: 8192,
  responseMimeType: "text/plain",
};

async function getGeminiResponse(prompt) {
  const chatSession = model.startChat({
    generationConfig,
    safetySettings: [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
    ],
    history: [],
  });

  const result = await chatSession.sendMessage(prompt);
  return result.response.text();
}


const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
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

  if (message.body.startsWith("coiso")) 
    {
    const prompt = message.body.replace("coiso", "").trim();
    const response = await getGeminiResponse(prompt);
    console.log(response);
    }




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
