// Importa módulos necessários
import pkg from "whatsapp-web.js";
const { MessageMedia } = pkg;
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import club from "club-atticus";
import r34API from "0000000r34api";
import HMfull from "hmfull";

// Inicializa o módulo NSFW
const nsfw = new club();

// Constantes
const WEBP_FILE_SIZE = 1000000; // Tamanho máximo permitido para arquivos WebP

// Função para enviar sticker
export async function sendSticker(client, message, senderName) {
  try {
    // Verifica se a mensagem é uma citação
    let mediaMessage = message.hasQuotedMsg ? await message.getQuotedMessage() : message;

    // Verifica se a mensagem contém mídia
    if (mediaMessage.hasMedia) {
      const media = await mediaMessage.downloadMedia();
      if (!media) {
        console.error("Erro ao baixar a mídia");
        return;
      }

      console.log(`Tamanho do arquivo de mídia: ${media.filesize} bytes (${(media.filesize / 1000000).toFixed(2)} MB)`);

      // Verifica o tipo de mídia e processa de acordo
      if (mediaMessage.type === "image") {
        // Envia imagem como sticker
        await client.sendMessage(message.from, media, {
          sendMediaAsSticker: true,
          stickerAuthor: "Anjinho Bot",
          stickerName: `Created by ${senderName}`,
        });
        await client.sendMessage(message.from, "Here is your image sticker 😈");
        console.log(`Sticker enviado para ${senderName}`);
      } else if (mediaMessage.type === "video") {
        // Processa vídeo para enviar como sticker
        await processVideoSticker(client, message, media, senderName);
      }
    }
  } catch (error) {
    console.error("Erro:", error);
  }
}

// Função auxiliar para processar vídeo e enviar como sticker
async function processVideoSticker(client, message, media, senderName) {
  const videoPath = "./src/media/temp-video.mp4";
  const reducedVideoPath = "./src/media/reduced-video.mp4";
  const outputWebpPath = "./src/media/output.webp";

  try {
    // Salva o vídeo temporariamente
    fs.writeFileSync(videoPath, media.data, "base64");

    // Reduz o tamanho do vídeo
    await new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .outputOptions([
          "-vf", "scale=-2:240",
          "-b:v", "300k",
          "-r", "15",
        ])
        .save(reducedVideoPath)
        .on("end", resolve)
        .on("error", reject);
    });

    // Converte o vídeo reduzido para WebP
    await new Promise((resolve, reject) => {
      ffmpeg(reducedVideoPath)
        .outputOptions([
          "-vcodec", "libwebp",
          "-vf", "scale=240:240:force_original_aspect_ratio=increase,crop=240:240,setsar=1",
          "-loop", "0",
          "-ss", "00:00:00.0",
          "-t", "00:00:05.0",
          "-preset", "default",
          "-an",
          "-vsync", "0",
          "-s", "240:240",
          "-quality", "80",
        ])
        .toFormat("webp")
        .save(outputWebpPath)
        .on("end", resolve)
        .on("error", reject);
    });

    // Verifica se o arquivo WebP foi criado e envia como sticker
    if (fs.existsSync(outputWebpPath)) {
      const webpSticker = MessageMedia.fromFilePath(outputWebpPath);
      if (fs.statSync(outputWebpPath).size > WEBP_FILE_SIZE) {
        console.error("Erro: O arquivo WebP final é muito grande");
        await client.sendMessage(message.from, "O arquivo de mídia é muito grande para ser processado.");
        return;
      }

      await client.sendMessage(message.from, webpSticker, {
        sendMediaAsSticker: true,
        stickerAuthor: "Anjinho Bot",
        stickerName: `Created by ${senderName}`,
      });
      await client.sendMessage(message.from, "Here is your video sticker 😈");
      console.log(`Sticker de vídeo enviado para ${senderName} em ${new Date().toLocaleString()}`);
    } else {
      console.error("Erro: O arquivo de saída webp não foi criado");
    }
  } catch (error) {
    console.error("Erro ao processar o vídeo:", error);
  } finally {
    // Limpa arquivos temporários
    [videoPath, reducedVideoPath, outputWebpPath].forEach(path => {
      if (fs.existsSync(path)) fs.unlinkSync(path);
    });
  }
}

// Função para enviar imagem
export async function sendImage(client, message) {
  try {
    let figbase = message.hasQuotedMsg ? await message.getQuotedMessage() : message;
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
      console.log(`Sending NSFW image ${category} to ${senderName} in ${new Date().toLocaleString()}`);
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
    console.log(`NSFW image ${category} sent to ${senderName} in ${new Date().toLocaleString()}`);
  } catch (error) {
    console.error(error);
    message.reply("Image not found.🥺");
  }
}

// Função para obter e enviar imagem de cuddle
export async function getCuddleImage() {
  try {
    let responseApi = await HMfull.Nekos.sfw.cuddle();
    let CuddleFig = responseApi.url;
    const media = await MessageMedia.fromUrl(CuddleFig);

    // Verifica se a mídia é um GIF e converte para WebP
    if (CuddleFig.endsWith(".gif")) {
      const gifPath = "./src/media/temp-cuddle.gif";
      const outputWebpPath = "./src/media/cuddle-sticker.webp";

      const gifData = await fetch(CuddleFig).then(res => res.arrayBuffer());
      fs.writeFileSync(gifPath, Buffer.from(gifData));

      await new Promise((resolve, reject) => {
        ffmpeg(gifPath)
          .outputOptions([
            "-vcodec", "libwebp",
            "-vf", "scale=240:240:force_original_aspect_ratio=increase,crop=240:240,setsar=1",
            "-loop", "0",
            "-preset", "default",
            "-an",
            "-vsync", "0",
            "-s", "240:240",
            "-quality", "80",
            "-lossless", "0",
            "-compression_level", "6",
            "-q:v", "50",
            "-pix_fmt", "yuv420p",
            "-f", "webp"
          ])
          .toFormat("webp")
          .save(outputWebpPath)
          .on("end", resolve)
          .on("error", reject);
      });

      fs.unlinkSync(gifPath);
      return MessageMedia.fromFilePath(outputWebpPath);
    }

    return media;
  } catch (error) {
    console.error("Erro ao obter imagem de cuddle:", error);
  }
}