// Import modules
import pkg from "whatsapp-web.js";
import { NSFW } from "nsfwhub";
const { MessageMedia } = pkg;
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";


// Initialize modules
const nsfw = new NSFW();

// Constants
const MAX_FILE_SIZE = 80000; // Defina o tamanho máximo do arquivo em bytes
const WEBP_FILE_SIZE = 1000000;


export async function sendSticker(client, message, senderName) {
  try {
    let mediaMessage = message;
    if (message.hasQuotedMsg) {
      mediaMessage = await message.getQuotedMessage();
    }

    if (mediaMessage.hasMedia) {
      const media = await mediaMessage.downloadMedia();
      console.log(`Tamanho do arquivo de mídia: ${media.filesize} bytes (${(media.filesize / 1000000).toFixed(2)} MB)`);

      if (!media) {
        console.error('Erro ao baixar a mídia');
        return;
      }

      if (mediaMessage.type === 'image') {
        if (media.filesize > MAX_FILE_SIZE) {
          console.error('Erro: O arquivo de mídia é muito grande');
          await client.sendMessage(message.from, 'O arquivo de mídia é muito grande para ser processado.');
          return;
        }

        await client.sendMessage(message.from, media, {
          sendMediaAsSticker: true,
          stickerAuthor: 'Anjinho Bot',
          stickerName: `Created by ${senderName}`,
        });
        await client.sendMessage(message.from, 'Here is your image sticker 😈');
        console.log(`Sticker enviado para ${senderName}`);
      } else if (mediaMessage.type === 'video') {
        const videoPath = './src/resources/media/temp-video.mp4';
        const reducedVideoPath = './src/resources/media/reduced-video.mp4';
        const outputWebpPath = './src/resources/media/output.webp';

        try {
          fs.writeFileSync(videoPath, media.data, 'base64');
        } catch (err) {
          console.error('Erro ao salvar o vídeo temporariamente:', err);
          return;
        }

        if (!fs.existsSync(videoPath)) {
          console.error('Erro: O arquivo de vídeo temporário não foi criado');
          return;
        }

        // Reduzir o tamanho do vídeo
        ffmpeg(videoPath)
          .outputOptions([
            '-vf', 'scale=-2:240', // Reduzir a resolução para 240p
            '-b:v', '300k', // Aumentar a taxa de bits para melhorar a qualidade
            '-r', '15' // Manter a taxa de quadros em 15 fps
          ])
          .save(reducedVideoPath)
          .on('end', () => {
            console.log('Tamanho do vídeo reduzido');

            ffmpeg(reducedVideoPath)
              .outputOptions([
                '-vcodec', 'libwebp',
                '-vf', 'scale=240:240:force_original_aspect_ratio=increase,crop=240:240,setsar=1',
                '-loop', '0',
                '-ss', '00:00:00.0',
                '-t', '00:00:05.0', // Limitar a duração para 5 segundos
                '-preset', 'default',
                '-an',
                '-vsync', '0',
                '-s', '240:240',
                '-quality', '80' // Ajustar a qualidade do WebP
              ])
              .toFormat('webp')
              .save(outputWebpPath)
              .on('end', async () => {
                try {
                  console.log('Vídeo convertido para webp');

                  if (fs.existsSync(outputWebpPath)) {
                    const webpSticker = MessageMedia.fromFilePath(outputWebpPath);

                    // Adicionando um log detalhado antes de enviar a mensagem
                    console.log(`Tentando enviar o sticker para ${message.from}`);
                    console.log(`Tamanho do arquivo WebP: ${fs.statSync(outputWebpPath).size} bytes`);

                    if (fs.statSync(outputWebpPath).size > WEBP_FILE_SIZE) {
                      console.error('Erro: O arquivo WebP final é muito grande');
                      await client.sendMessage(message.from, 'O arquivo de mídia é muito grande para ser processado.');
                      return;
                    }

                    await client.sendMessage(message.from, webpSticker, {
                      sendMediaAsSticker: true, stickerAuthor: 'Anjinho Bot', stickerName: `Created by ${senderName}`
                    });
                    
                    await client.sendMessage(message.from, 'Here is your video sticker 😈');
                    console.log(`Sticker de vídeo enviado para ${senderName} em ${new Date().toLocaleString()}`);
                  } else {
                    console.error('Erro: O arquivo de saída webp não foi criado');
                  }
                } catch (error) {
                  console.error('Erro ao enviar a mensagem:', error);
                } finally {
                  // Limpeza de arquivos temporários
                  if (fs.existsSync(videoPath)) {
                    fs.unlinkSync(videoPath);
                  }
                  if (fs.existsSync(reducedVideoPath)) {
                    fs.unlinkSync(reducedVideoPath);
                  }
                  if (fs.existsSync(outputWebpPath)) {
                    fs.unlinkSync(outputWebpPath);
                  }
                }
              })
              .on('error', (err) => {
                console.error('Erro ao processar o vídeo:', err);

                // Limpeza de arquivos temporários em caso de erro
                if (fs.existsSync(videoPath)) {
                  fs.unlinkSync(videoPath);
                }
                if (fs.existsSync(reducedVideoPath)) {
                  fs.unlinkSync(reducedVideoPath);
                }
                if (fs.existsSync(outputWebpPath)) {
                  fs.unlinkSync(outputWebpPath);
                }
              });
          })
          .on('error', (err) => {
            console.error('Erro ao reduzir o tamanho do vídeo:', err);

            // Limpeza de arquivos temporários em caso de erro
            if (fs.existsSync(videoPath)) {
              fs.unlinkSync(videoPath);
            }
            if (fs.existsSync(reducedVideoPath)) {
              fs.unlinkSync(reducedVideoPath);
            }
          });
      }
    }
  } catch (error) {
    console.error('Erro:', error);
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
