// Importa módulos necessários
import pkg from "whatsapp-web.js";
const { MessageMedia } = pkg;
import { createSticker } from "sticker-maker-wa";
import ffmpegPath from "ffmpeg-static";
import fs from "fs";
import club from "club-atticus";
import r34API from "0000000r34api";
import HMfull from "hmfull";
import dotenv from "dotenv";
import { promisify } from "util";
import axios from 'axios';
import ffmpeg from 'fluent-ffmpeg';  // Add this import if not already present

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

// Função auxiliar para limpar arquivos temporários
async function cleanupFiles(...files) {
  for (const file of files) {
    if (file && fs.existsSync(file)) {
      try {
        await unlinkAsync(file);
        console.log(`Arquivo temporário removido: ${file}`);
      } catch (error) {
        console.error(`Erro ao remover arquivo temporário ${file}:`, error);
      }
    }
  }
}

export async function sendSticker(client, message, senderName) {
  let tempInputPath, tempOutputPath;
  try {
    const mediaMessage = message.hasQuotedMsg ? await message.getQuotedMessage() : message;
    if (!mediaMessage.hasMedia) {
      await message.reply("Por favor, envie uma imagem ou vídeo para criar um sticker.");
      return;
    }

    const media = await mediaMessage.downloadMedia();
    if (!media) throw new Error("Erro ao baixar a mídia");

    const isAnimated = media.mimetype === 'image/gif' || media.mimetype.includes('video');
    tempInputPath = `./temp_input_${Date.now()}${isAnimated ? '.gif' : '.png'}`;
    tempOutputPath = `./temp_output_${Date.now()}.webp`;

    await writeFileAsync(tempInputPath, media.data, "base64");

    // Configurações comuns do FFmpeg
    const commonOptions = [
      "-vcodec", "libwebp",
      "-preset", "default",
      "-compression_level", "6",
      "-quality", "80",
      "-pix_fmt", "yuva420p",
      "-f", "webp",
      "-vsync", "0"
    ];

    if (isAnimated) {
      // Configurações específicas para mídia animada
      await new Promise((resolve, reject) => {
        ffmpeg(tempInputPath)
          .setStartTime(0)
          .setDuration(MAX_VIDEO_DURATION)
          .outputOptions([
            ...commonOptions,
            "-vf", "fps=15,scale=512:512:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000,setsar=1",
            "-loop", "0",
            "-an",
            "-fs", "999K"
          ])
          .toFormat("webp")
          .on('start', () => console.log('Iniciando conversão do sticker animado...'))
          .on('progress', (progress) => {
            if (progress && progress.percent) {
              console.log('Progresso:', progress.percent, '%');
            }
          })
          .on('end', resolve)
          .on('error', reject)
          .save(tempOutputPath);
      });
    } else {
      // Configurações específicas para imagem estática
      await new Promise((resolve, reject) => {
        ffmpeg(tempInputPath)
          .outputOptions([
            ...commonOptions,
            "-vf", "scale=512:512:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000,setsar=1",
            "-frames:v", "1",
            "-fs", "999K"
          ])
          .toFormat("webp")
          .on('start', () => console.log('Iniciando conversão do sticker estático...'))
          .on('end', resolve)
          .on('error', reject)
          .save(tempOutputPath);
      });
    }

    const stickerMedia = MessageMedia.fromFilePath(tempOutputPath);
    await client.sendMessage(message.from, stickerMedia, { 
      sendMediaAsSticker: true,
      stickerAuthor: `Created by ${senderName}`,
      stickerName: "Anjinho Bot"
    });

    console.log(`Sticker ${isAnimated ? 'animado' : 'estático'} enviado para ${senderName}`);
  } catch (error) {
    console.error("Erro ao processar sticker:", error);
    await message.reply("Ocorreu um erro ao criar o sticker. Por favor, tente novamente.");
  } finally {
    await cleanupFiles(tempInputPath, tempOutputPath);
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
        `Enviando imagem NSFW ${category} para ${senderName} em ${new Date().toLocaleString()}`
      );
      const nsfwImage = await nsfw[category]();
      
      // Use axios para baixar a imagem
      const response = await axios.get(nsfwImage, { responseType: 'arraybuffer' });
      const buffer = Buffer.from(response.data, 'binary');
      
      // Crie o MessageMedia diretamente do buffer
      const media = new MessageMedia('image/jpeg', buffer.toString('base64'));
      
      await client.sendMessage(message.from, media, { caption: `Aqui está sua imagem ${category}!` });
      console.log(`Imagem NSFW ${category} enviada com sucesso para ${senderName}`);
    } else {
      throw new Error(`Categoria ${category} não encontrada`);
    }
  } catch (error) {
    console.error(`Erro ao enviar imagem NSFW (${category}):`, error);
    message.reply("Desculpe, ocorreu um erro ao processar sua solicitação. Por favor, tente novamente mais tarde.");
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
  let gifPath = null;
  let outputWebpPath = null;
  try {
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
        gifPath = "./src/media/temp-image.gif";
        outputWebpPath = "./src/media/image-sticker.webp";

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

        const result = MessageMedia.fromFilePath(outputWebpPath);
        return result;
      } catch (error) {
        console.error("Erro ao obter GIF, tentando novamente:", error);
      }
    }
  } catch (error) {
    console.error("Erro ao obter GIF:", error);
    throw error;
  } finally {
    await cleanupFiles(gifPath, outputWebpPath);
  }
}

export async function getRandomGif() {
  let gifPath = null;
  let outputWebpPath = null;
  try {
    const gf = new GiphyFetch(process.env.GIPHY_API_KEY);
    const { data } = await gf.random({ tag: "cat" });

    let imageUrl = data.images.original.url;

    // Verifica se a mídia é um GIF e converte para WebP
    if (imageUrl) {
      gifPath = "./src/media/temp-image.gif";
      outputWebpPath = "./src/media/image-sticker.webp";

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

      const result = MessageMedia.fromFilePath(outputWebpPath);
      return result;
    } else {
      // Se não for um GIF, retorne a URL diretamente
      return imageUrl;
    }
  } catch (error) {
    console.error("Erro ao processar GIF:", error);
    throw error;
  } finally {
    await cleanupFiles(gifPath, outputWebpPath);
  }
}
