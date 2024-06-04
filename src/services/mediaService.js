import pkg from 'whatsapp-web.js';
import { NSFW } from "nsfwhub";
const { MessageMedia } = pkg;

const nsfw = new NSFW();

export async function sendSticker(client, message, senderName) {
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
}

export async function sendImage(client, message) {
  let figbase = message;
  if (message.hasQuotedMsg) {
    figbase = await message.getQuotedMessage();
  }
  if (figbase.hasMedia) {
    const media = await figbase.downloadMedia();
    await client.sendMessage(message.from, media);
  }
}

export async function sendNSFWImage(client, message, senderName, category) {
  try {
    const nsfw_image = await nsfw.fetch(category);
    const image_url = nsfw_image.image.url;
    const media = await MessageMedia.fromUrl(image_url);
    await client.sendMessage(message.from, media);
    console.log(`${category} image sent to ${senderName}`);
  } catch (error) {
    console.error(error);
    message.reply("Failed to fetch image.");
  }
}