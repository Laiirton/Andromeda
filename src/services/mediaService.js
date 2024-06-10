import pkg from "whatsapp-web.js";
import { NSFW } from "nsfwhub";
import sharp from "sharp";
const { MessageMedia } = pkg;
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import { spawn } from "child_process";

const nsfw = new NSFW();

export async function sendSticker(client, message, senderName) {
  try {
    let mediaMessage = message;
    if (message.hasQuotedMsg) {
      mediaMessage = await message.getQuotedMessage();
    }
    if (mediaMessage.hasMedia && mediaMessage.type === "image") {
      const media = await mediaMessage.downloadMedia();
      await client.sendMessage(message.from, media, {
        sendMediaAsSticker: true,
        stickerAuthor: "Anjinho Bot ",
        stickerName: `Create by ${senderName}`,
      });
    }
    console.log(`Sticker sent to ${senderName}`);

    // if (mediaMessage.type === "video") {
    //   console.log("Video sticker");

    //   const getMediaData = await mediaMessage.downloadMedia();
    //   const stickerBuffer = getMediaData.data.toString("base64");
    //   const videoBuffer = Buffer.from(stickerBuffer, "base64");

    //   fs.writeFileSync("./src/media/temp.mp4", videoBuffer);

    //   const ffmpegProcess = spawn("ffmpeg", [
    //     "-i",
    //     "./src/media/temp.mp4",
    //     "-vcodec",
    //     "libwebp",
    //     "-vf",
    //     "scale=512:512",
    //     "-loop",
    //     "0",
    //     "-ss",
    //     "00:00:00.0",
    //     "-t",
    //     "00:00:05.0",
    //     "-preset",
    //     "default",
    //     "-an",
    //     "-vsync",
    //     "0",
    //     "-s",
    //     "512x512",
    //     "-f",
    //     "webp",
    //     "-y",
    //     "./src/media/temp.webp",
    //   ]);

    //   ffmpegProcess.on("close", async (code) => {
    //     console.log(`FFmpeg process exited with code ${code}`);
    //     if (code === 0) {
    //       await client.sendMessage(
    //         message.from,
    //         MessageMedia.fromFilePath("./src/media/temp.webp"),
    //         {
    //           sendMediaAsSticker: true,
    //           stickerAuthor: "Anjinho Bot ",
    //           stickerName: `Create by ${senderName}`,
    //         }
    //       );
    //       // Delete the files after they have been sent
    //       fs.unlinkSync("./src/media/temp.mp4");
    //       fs.unlinkSync("./src/media/temp.webp");
    //     }
    //   });

    //   ffmpegProcess.stdout.on("data", (data) => {
    //     console.log(`stdout: ${data}`);
    //   });

    //   ffmpegProcess.stderr.on("data", (data) => {
    //     console.error(`stderr: ${data}`);
    //   });
    // }
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
    console.log(
      `${category} image sent to ${senderName} at ${new Date().toLocaleString()}`
    );
  } catch (error) {
    console.error(error);
    message.reply(
      "An error occurred while trying to download the image, please try again."
    );
  }
}
