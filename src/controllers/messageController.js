import {
  sendSticker,
  sendImage,
  sendNSFWImage,
  searchRule34,
} from "../services/mediaService.js";
import { getGeminiResponse } from "../services/googleAIService.js";
import { menu, menuNSFW, pokemonSystemInfo } from "../utils/lang.js";
import {
  deleteMessage,
  messageLog,
  printGroupList,
} from "../utils/chatTools.js";
import { ollamaGenerate } from "../services/ollama.js";
import { whisperTranscription } from "../services/whisper.js";
import pkg from "whatsapp-web.js";
const { MessageMedia } = pkg;
import { addToQueue } from "../utils/requestQueue.js";
import { searchR34, getRandomR34 } from "../services/r34Service.js";
import {
  handleLevelCommand,
  handleTopRankCommand,
  handleLevelSystemToggle,
  processMessage as processLevelMessage,
  isLevelSystemActive
} from '../services/levelsystem/index.js';
import { handleRandomChat, processRandomChat } from "../services/randomChat/randomChatHandler.js";
import { resetCaptureTime } from '../services/pokemon/adminCommands.js';
import PokemonController from './pokemonController.js';


const EMPTY_PROMPT_ERROR = "O prompt não pode estar vazio.";
const PROMPT_REPLY = "Oi, você precisa me dizer o que deseja.";

class MessageController {
  static levenshteinDistance(a, b) {
    const matrix = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }

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
    const chat = await message.getChat();

    console.log(`Processando comando: ${command} com argumentos: ${args.join(', ')}`);

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
      pokemon: () => PokemonController.handlePokemon(client, message, senderName),
      pokedex: (args) => PokemonController.handlePokedex(client, message, senderName, args),
      companion: () => PokemonController.handleChooseCompanion(client, message, senderName),
      trade: () => PokemonController.handleTrade(client, message, senderName, args),
      accepttrade: () => PokemonController.handleAcceptTrade(client, message, senderName, args),
      rejecttrade: () => PokemonController.handleRejectTrade(client, message, senderName),
      pendingtrades: () => PokemonController.handlePendingTrades(client, message, senderName),
      sacrificar: (args) => PokemonController.handleSacrificePokemon(client, message, senderName, args),
      sacrificiostatus: () => PokemonController.handleSacrificeStatus(client, message, senderName),
      pokesystem: () => message.reply(pokemonSystemInfo),
      levelsystem: () => handleLevelSystemToggle(message, args),
      level: () => handleLevelCommand(message),
      toprank: () => handleTopRankCommand(client, message),
      randomchat: () => handleRandomChat(message),
      resetcapturetime: () => PokemonController.handleResetCaptureTime(client, message, senderName),
      captureall: () => PokemonController.handleCaptureAll(client, message, senderName),
      stats: () => PokemonController.handlePokemonStats(client, message, senderName, args),
    };

    const handler = commandHandlers[command];
    if (handler) {
      console.log(`Handler encontrado para o comando: ${command}`);
      try {
        if (typeof handler === 'function') {
          await handler(args);
        } else {
          await handler();
        }
        console.log(`Comando ${command} executado com sucesso`);
      } catch (error) {
        console.error(`Erro ao executar o comando ${command}:`, error);
        await message.reply(`Ocorreu um erro ao executar o comando ${command}. Por favor, tente novamente mais tarde.`);
      }
    } else {
      console.log(`Nenhum handler encontrado para o comando: ${command}`);
      // Encontrar o comando mais próximo
      const availableCommands = Object.keys(commandHandlers);
      let closestCommand = '';
      let minDistance = Infinity;

      for (const cmd of availableCommands) {
        const distance = this.levenshteinDistance(command, cmd);
        if (distance < minDistance) {
          minDistance = distance;
          closestCommand = cmd;
        }
      }

      // Sugerir o comando mais próximo se a distância for menor que 3
      if (minDistance < 3) {
        await message.reply(`Comando inválido. Você quis dizer "!${closestCommand}"? Digite !menu para ver todos os comandos disponíveis.`);
      } else {
        await message.reply("Comando inválido. Digite !menu para ver os comandos disponíveis.");
      }
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

  static async processMessage(client, message) {
    const contact = await message.getContact();
    const senderName = contact.pushname;
    const chat = await message.getChat();
    const phoneNumber = message.author || message.from.split('@')[0];

    console.log(`Processando mensagem: "${message.body}" de ${senderName} (${phoneNumber})`);

    messageLog(message, senderName);

    if (chat.isGroup) {
      const isActive = await isLevelSystemActive(chat.id._serialized);
      if (isActive) {
        console.log(`Processando mensagem para sistema de níveis: ${senderName} (${phoneNumber}) no grupo ${chat.name}`);
        const levelUp = await processLevelMessage(phoneNumber, chat.id._serialized, senderName);
        if (levelUp) {
          await message.reply(`🎉 Parabéns, ${senderName}! Você subiu para o nível ${levelUp}! 🎉`);
          console.log(`${senderName} subiu para o nível ${levelUp} no grupo ${chat.name}`);
        }
      }

      await processRandomChat(client, message, chat);
    }

    const lowerCaseBody = message.body.toLowerCase();
    console.log(`Mensagem em minúsculas: "${lowerCaseBody}"`);

    if (lowerCaseBody.includes("coiso")) {
      console.log("Processando comando 'coiso'");
      await this.handleGenerativeAI(message, senderName, "coiso", getGeminiResponse);
    } else if (lowerCaseBody.includes("porrinha")) {
      console.log("Processando comando 'porrinha'");
      await this.handleGenerativeAI(message, senderName, "porrinha", ollamaGenerate);
    } else if (message.body.startsWith("!")) {
      console.log("Processando comando com '!'");
      const [command, ...args] = message.body.toLowerCase().slice(1).split(" ");
      console.log(`Comando detectado: ${command}, Argumentos: ${args.join(', ')}`);
      try {
        await MessageController.handleCommand(client, message, command, args);
      } catch (error) {
        console.error(`Erro ao processar comando ${command}:`, error);
        await message.reply("Ocorreu um erro ao processar o comando. Por favor, tente novamente mais tarde.");
      }
    } else {
      console.log("Nenhum comando reconhecido");
    }
  }
}

export const processMessage = MessageController.processMessage;