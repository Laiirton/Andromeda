import {
  sendSticker,
  sendImage,
  sendNSFWImage,
  searchRule34,
} from "../services/mediaService.js";
import { getGeminiResponse } from "../services/googleAIService.js";
import { menu, menuNSFW } from "../utils/lang.js";
import {
  deleteMessage,
  messageLog,
  printGroupList,
} from "../utils/chatTools.js";
import { ollamaGenerate } from "../services/ollama.js";
import { whisperTranscription } from "../services/whisper.js";
import {
  getRandomPokemonNameAndImage,
  getUserPokemon,
  chooseCompanion,
} from "../services/pokemon.js";
import pkg from "whatsapp-web.js";
const { MessageMedia } = pkg;
import { addToQueue } from "../utils/requestQueue.js";
import { searchR34, getRandomR34 } from "../services/r34Service.js";

const EMPTY_PROMPT_ERROR = "O prompt não pode estar vazio.";
const PROMPT_REPLY = "Oi, você precisa me dizer o que deseja.";

class MessageController {
  static async handleGenerativeAI(message, senderName, keyword, generateResponse) {
    try {
      const prompt = await this.extractPrompt(message, keyword);
      if (!prompt) {
        await message.reply(PROMPT_REPLY);
        throw new Error(EMPTY_PROMPT_ERROR);
      }

      console.log(`[${new Date().toLocaleString()}] Gerando resposta para o prompt: ${prompt}`);
      const response = await generateResponse(prompt);

      console.log(`[${new Date().toLocaleString()}] Usuário ${senderName} solicitou uma resposta para o prompt: ${prompt} e recebeu a resposta: ${response}`);
      await message.reply(response);
    } catch (error) {
      console.error(`[${new Date().toLocaleString()}] Erro ao gerar resposta: ${error.message}`);
    }
  }

  static async extractPrompt(message, keyword) {
    const quotedMessage = await message.getQuotedMessage();
    if (quotedMessage) {
      return `${quotedMessage.body.trim()} ${message.body.replace(new RegExp(keyword, "i"), "").trim()}`;
    }
    return message.body.replace(new RegExp(keyword, "i"), "").trim();
  }

  static async handleCommand(client, message, command, args) {
    const contact = await message.getContact();
    const senderName = contact.pushname;

    const commandHandlers = {
      transcribe: () => this.handleTranscribe(message),
      fig: () => sendSticker(client, message, senderName),
      img: () => sendImage(client, message),
      delete: () => deleteMessage(message, senderName),
      pussy: () => this.handleNSFW(client, message, senderName, command),
      ass: () => this.handleNSFW(client, message, senderName, command),
      dick: () => this.handleNSFW(client, message, senderName, command),
      futa: () => this.handleNSFW(client, message, senderName, command),
      hentai: () => this.handleNSFW(client, message, senderName, command),
      yaoi: () => this.handleNSFW(client, message, senderName, command),
      boobs: () => this.handleNSFW(client, message, senderName, command),
      gay: () => this.handleNSFW(client, message, senderName, command),
      r34: () => this.handleR34(client, message, senderName, message.body.split(' ')[1]),
      r34random: () => this.handleR34Random(client, message, senderName),
      menu: () => message.reply(menu),
      nsfw: () => message.reply(menuNSFW),
      groups: () => printGroupList(client),
      pokemon: () => this.handlePokemon(client, message, senderName),
      pokedex: (args) => this.handlePokedex(client, message, senderName, args[0]),
      companion: () => this.handleChooseCompanion(client, message, senderName),
    };

    const handler = commandHandlers[command];
    if (handler) {
      if (typeof handler === 'function') {
        await handler(args);
      } else {
        await handler();
      }
    } else {
      await message.reply("Comando inválido. Digite !menu para ver os comandos disponíveis.");
    }
  }

  static async handleTranscribe(message) {
    const quotedMessage = await message.getQuotedMessage();
    const media = await quotedMessage.downloadMedia();
    const audioBuffer = Buffer.from(media.data, "base64");
    const transcription = await whisperTranscription(audioBuffer);
    console.log("Resultado da transcrição:", transcription);
    await message.reply(transcription);
  }

  static async handleNSFW(client, message, senderName, category) {
    await sendNSFWImage(client, message, senderName, category);
  }

  static async handleRule34(client, message, senderName) {
    const prompt = message.body.slice(5).trim();
    await searchRule34(client, message, senderName, [prompt]);
  }

  static async handlePokemon(client, message, senderName) {
    try {
      const result = await addToQueue(() => getRandomPokemonNameAndImage(senderName));
      if (result.error) {
        await message.reply(result.error);
      } else {
        let media;
        if (result.imageUrl.startsWith('http')) {
          media = await MessageMedia.fromUrl(result.imageUrl);
        } else {
          const fs = await import('fs/promises');
          const buffer = await fs.readFile(result.imageUrl);
          media = new MessageMedia('image/jpeg', buffer.toString('base64'), `${result.name}.jpg`);
        }
        const shinyStatus = result.isShiny ? "✨ Shiny ✨" : "normal";
        const rarityStatus = result.isLegendary ? "Lendário" : (result.isMythical ? "Mítico" : "");
        let caption = `Parabéns, ${senderName}! Você capturou um ${result.name} ${shinyStatus}${rarityStatus ? ` (${rarityStatus})` : ''}!\nCapturas restantes: ${result.capturesRemaining}`;
        
        await client.sendMessage(message.from, media, { caption });

        if (result.companionEvolution) {
          await message.reply(result.companionEvolution);
          
          if (result.companionImage) {
            const companionMedia = await MessageMedia.fromUrl(result.companionImage);
            await client.sendMessage(message.from, companionMedia, {
              caption: `Seu companheiro evoluiu para ${result.companionEvolution.split(' ').pop()}!`
            });
          }
        }
      }
    } catch (error) {
      console.error("Erro ao obter Pokémon aleatório:", error);
      await message.reply("Desculpe, ocorreu um erro inesperado. Tente novamente mais tarde.");
    }
  }

  static async handlePokedex(client, message, senderName) {
    try {
      const args = message.body.split(' ');
      const page = args.length > 1 ? parseInt(args[1]) : 1;
      
      const result = await addToQueue(() => getUserPokemon(senderName, page));
      if (result.error) {
        await message.reply(result.error);
      } else {
        const { pokedexImages, pokemonCount, currentPage, totalPages } = result;
        
        for (let i = 0; i < pokedexImages.length; i++) {
          const media = new MessageMedia('image/jpeg', pokedexImages[i].toString('base64'), `pokedex_${i+1}.jpg`);
          const caption = i === 0 
            ? `Essa é a sua Pokédex, ${senderName}! Você já capturou ${pokemonCount} Pokémon!\nPágina ${currentPage} de ${totalPages}`
            : `Pokédex de ${senderName} - Página ${currentPage} de ${totalPages}`;
          await client.sendMessage(message.from, media, { caption });
        }
        
        if (currentPage < totalPages) {
          await message.reply(`Para ver a próxima página, use o comando !pokedex ${currentPage + 1}`);
        }
        if (currentPage > 1) {
          await message.reply(`Para ver a página anterior, use o comando !pokedex ${currentPage - 1}`);
        }
      }
    } catch (error) {
      console.error("Erro ao enviar Pokédex:", error);
      await message.reply("Desculpe, ocorreu um erro ao buscar sua Pokédex. Tente novamente mais tarde.");
    }
  }

  static async handleR34(client, message, senderName, tag) {
    try {
      let result;
      if (tag) {
        result = await searchR34(tag);
      } else {
        await message.reply("Por favor, forneça uma tag para buscar imagens R34 específicas. Para imagens aleatórias, use !r34random.");
        return;
      }

      if (result && result.length > 0) {
        const randomImage = result[Math.floor(Math.random() * result.length)];
        const media = await MessageMedia.fromUrl(randomImage);
        await client.sendMessage(message.from, media, {
          caption: `Aqui está sua imagem R34 para "${tag}"!`
        });
        console.log(`Imagem R34 enviada para ${senderName} em ${new Date().toLocaleString()}`);
      } else {
        await message.reply("Desculpe, não encontrei nenhuma imagem para essa tag.");
      }
    } catch (error) {
      console.error("Erro ao buscar imagem R34:", error);
      await message.reply("Ocorreu um erro ao buscar a imagem. Por favor, tente novamente mais tarde.");
    }
  }

  static async handleR34Random(client, message, senderName) {
    try {
      const result = await getRandomR34();
      if (result) {
        const media = await MessageMedia.fromUrl(result);
        await client.sendMessage(message.from, media, {
          caption: "Aqui está sua imagem R34 aleatória!"
        });
        console.log(`Imagem R34 aleatória enviada para ${senderName} em ${new Date().toLocaleString()}`);
      } else {
        await message.reply("Desculpe, não foi possível obter uma imagem R34 aleatória.");
      }
    } catch (error) {
      console.error("Erro ao buscar imagem R34 aleatória:", error);
      await message.reply("Ocorreu um erro ao buscar a imagem aleatória. Por favor, tente novamente mais tarde.");
    }
  }

  static async handleChooseCompanion(client, message, senderName) {
    const companionName = message.body.split(' ').slice(1).join(' ').trim();
    if (!companionName) {
      await message.reply("Por favor, forneça o nome do Pokémon que você deseja como companheiro. Exemplo: !companion Pikachu");
      return;
    }

    try {
      const result = await chooseCompanion(senderName, companionName);
      if (result.error) {
        await message.reply(result.error);
      } else {
        if (result.imageUrl) {
          const media = await MessageMedia.fromUrl(result.imageUrl);
          await client.sendMessage(message.from, media, {
            caption: result.message
          });
        } else {
          await message.reply(result.message);
        }
      }
    } catch (error) {
      console.error("Erro ao escolher companheiro:", error);
      await message.reply("Desculpe, ocorreu um erro ao escolher seu companheiro. Tente novamente mais tarde.");
    }
  }

  static async processMessage(client, message) {
    const contact = await message.getContact();
    const senderName = contact.pushname;

    messageLog(message, senderName);

    const lowerCaseBody = message.body.toLowerCase();
    if (lowerCaseBody.includes("coiso")) {
      await this.handleGenerativeAI(message, senderName, "coiso", getGeminiResponse);
    } else if (lowerCaseBody.includes("porrinha")) {
      await this.handleGenerativeAI(message, senderName, "porrinha", ollamaGenerate);
    } else if (message.body.startsWith("!")) {
      const [command, ...args] = message.body.toLowerCase().slice(1).split(" ");
      await MessageController.handleCommand(client, message, command, args);
    }
  }
}

export const processMessage = MessageController.processMessage;