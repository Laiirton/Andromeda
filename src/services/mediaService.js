// Importa módulos necessários
import pkg from "whatsapp-web.js";
const { MessageMedia } = pkg;
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import club from "club-atticus";
import r34API from "0000000r34api";
import HMfull from "hmfull";
import dotenv from "dotenv";
import { promisify } from "util";

dotenv.config();
const nsfw = new club();


const MAX_WEBP_SIZE = 500 * 1024; // 500KB
const MAX_VIDEO_DURATION = 5; // 5 segundos

const writeFileAsync = promisify(fs.writeFile);
const unlinkAsync = promisify(fs.unlink);
const statAsync = promisify(fs.stat);

async function compressWebp(inputPath, outputPath, quality = 80) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .outputOptions([
        "-vcodec", "libwebp",
        "-vf", "scale=240:240:force_original_aspect_ratio=decrease,format=rgba,pad=240:240:(ow-iw)/2:(oh-ih)/2:color=#00000000,setsar=1",
        "-loop", "0",
        "-preset", "default",
        "-an",
        "-vsync", "0",
        "-t", `${MAX_VIDEO_DURATION}`,
        "-quality", quality,
        "-compression_level", "6",
        "-q:v", "50",
        "-pix_fmt", "yuva420p",
      ])
      .toFormat("webp")
      .save(outputPath)
      .on("end", resolve)
      .on("error", reject);
  });
}

async function ensureWebpSize(inputPath, outputPath) {
  let quality = 80;
  while (quality > 0) {
    await compressWebp(inputPath, outputPath, quality);
    const stats = await statAsync(outputPath);
    if (stats.size <= MAX_WEBP_SIZE) break;
    quality -= 10;
  }
  if (quality <= 0) throw new Error("Não foi possível comprimir o arquivo para o tamanho desejado");
}

export async function sendSticker(client, message, senderName) {
  try {
    const mediaMessage = message.hasQuotedMsg ? await message.getQuotedMessage() : message;
    if (!mediaMessage.hasMedia) return;

    const media = await mediaMessage.downloadMedia();
    if (!media) throw new Error("Erro ao baixar a mídia");

    const tempPath = `./temp_${Date.now()}`;
    const outputPath = `${tempPath}.webp`;

    await writeFileAsync(tempPath, media.data, "base64");

    if (mediaMessage.type === "image") {
      await ensureWebpSize(tempPath, outputPath);
    } else if (mediaMessage.type === "video") {
      await new Promise((resolve, reject) => {
        ffmpeg(tempPath)
          .outputOptions(["-t", `${MAX_VIDEO_DURATION}`, "-vf", "scale=240:-1"])
          .save(`${tempPath}_reduced.mp4`)
          .on("end", resolve)
          .on("error", reject);
      });
      await ensureWebpSize(`${tempPath}_reduced.mp4`, outputPath);
      await unlinkAsync(`${tempPath}_reduced.mp4`);
    }

    const webpSticker = MessageMedia.fromFilePath(outputPath);
    await client.sendMessage(message.from, webpSticker, {
      sendMediaAsSticker: true,
      stickerAuthor: "Anjinho Bot",
      stickerName: `Created by ${senderName}`,
    });

    await unlinkAsync(tempPath);
    await unlinkAsync(outputPath);

    console.log(`Sticker enviado para ${senderName} em ${new Date().toLocaleString()}`);
  } catch (error) {
    console.error("Erro ao processar sticker:", error);
  }
}

// Função para enviar imagem
export async function sendImage(client, message) {
  try {
    let figbase = message.hasQuotedMsg
      ? await message.getQuotedMessage()
      : message;
    if (figbase.hasMedia) {
      const media = await figbase.downloadMedia();
      await client.sendMessage(message.from, media);
    }
  } catch (error) {
    console.error("Error function sendImage:", error);
  }
}

// Função para enviar imagem NSFW
export async function sendNSFWImage(client, message, senderName, category) {
  try {
    if (nsfw[category]) {
      console.log(
        `Sending NSFW image ${category} to ${senderName} in ${new Date().toLocaleString()}`
      );
      const nsfwImage = await nsfw[category]();
      const media = await MessageMedia.fromUrl(nsfwImage);
      await client.sendMessage(message.from, media);
    }
  } catch (error) {
    console.error(error);
    message.reply("Under maintenance.😭");
  }
}

// Função para buscar e enviar imagem do Rule34
export async function searchRule34(client, message, senderName, category) {
  try {
    let imageurl = await r34API.rule34(category);
    let urlFormated = imageurl.replace(/"/g, "");
    const media = await MessageMedia.fromUrl(urlFormated);
    await client.sendMessage(message.from, media);
    console.log(
      `NSFW image ${category} sent to ${senderName} in ${new Date().toLocaleString()}`
    );
  } catch (error) {
    console.error(error);
    message.reply("Image not found.🥺");
  }
}

// Função para obter e enviar um GIF aleatório
export async function getRandomImage() {
  const categories = [
    "pat",
    "hug",
    "kiss",
    "smug",
    "neko",
    "waifu",
    "cuddle",
    "feed",
    "foxgirl",
  ];

  while (true) {
    try {
      const randomCategory =
        categories[Math.floor(Math.random() * categories.length)];

      // Verifica se a função existe e se retorna um GIF
      if (
        typeof HMfull.Nekos.sfw[randomCategory] !== "function" ||
        !HMfull.Nekos.sfw[randomCategory].isGif
      ) {
        console.error(
          `Função para a categoria ${randomCategory} não encontrada ou não retorna um GIF, tentando novamente...`
        );
        continue;
      }

      let responseApi = await HMfull.Nekos.sfw[randomCategory]();
      let imageUrl = responseApi.url;

      // Converte o GIF para WebP
      const gifPath = "./src/media/temp-image.gif";
      const outputWebpPath = "./src/media/image-sticker.webp";

      const gifData = await fetch(imageUrl).then((res) => res.arrayBuffer());
      fs.writeFileSync(gifPath, Buffer.from(gifData));

      await new Promise((resolve, reject) => {
        ffmpeg(gifPath)
          .outputOptions([
            "-vcodec",
            "libwebp",
            "-vf",
            "scale=240:240:force_original_aspect_ratio=increase,crop=240:240,setsar=1",
            "-loop",
            "0",
            "-preset",
            "default",
            "-an",
            "-vsync",
            "0",
            "-s",
            "240:240",
            "-quality",
            "100",
            "-lossless",
            "0",
            "-compression_level",
            "6",
            "-q:v",
            "50",
            "-pix_fmt",
            "yuv420p",
            "-f",
            "webp",
          ])
          .toFormat("webp")
          .save(outputWebpPath)
          .on("end", resolve)
          .on("error", reject);
      });

      fs.unlinkSync(gifPath);
      return MessageMedia.fromFilePath(outputWebpPath);
    } catch (error) {
      console.error("Erro ao obter GIF, tentando novamente:", error);
    }
  }
}

export async function getRandomGif() {
  const gf = new GiphyFetch(process.env.GIPHY_API_KEY);
  const { data } = await gf.random({ tag: "cat" });

  let imageUrl = data.images.original.url;

  // Verifica se a mídia é um GIF e converte para WebP
  if (imageUrl) {
    const gifPath = "./src/media/temp-image.gif";
    const outputWebpPath = "./src/media/image-sticker.webp";

    const gifData = await fetch(imageUrl).then((res) => res.arrayBuffer());
    fs.writeFileSync(gifPath, Buffer.from(gifData));

    await new Promise((resolve, reject) => {
      ffmpeg(gifPath)
        .outputOptions([
          "-vcodec",
          "libwebp",
          "-vf",
          "scale=240:240:force_original_aspect_ratio=increase,crop=240:240,setsar=1",
          "-loop",
          "0",
          "-preset",
          "default",
          "-an",
          "-vsync",
          "0",
          "-s",
          "240:240",
          "-quality",
          "100",
          "-lossless",
          "0",
          "-compression_level",
          "6",
          "-q:v",
          "50",
          "-pix_fmt",
          "yuv420p",
          "-f",
          "webp",
        ])
        .toFormat("webp")
        .save(outputWebpPath)
        .on("end", resolve)
        .on("error", reject);
    });

    fs.unlinkSync(gifPath);

    console.log("Url do GIF:", imageUrl);

    return MessageMedia.fromFilePath(outputWebpPath);
  } else {
    // Se não for um GIF, retorne a URL diretamente
    return imageUrl;
  }
}
