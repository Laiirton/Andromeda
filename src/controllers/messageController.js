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
import {
  getRandomPokemonNameAndImage,
  getUserPokemon,
  chooseCompanion,
  initiateTrade,
  respondToTrade,
  getPendingTradeForUser,
  getPendingTradesForUser,
  tradeForCaptures,
  getUserTradeStatus,
  sacrificePokemon,
  getUserSacrificeStatus
} from "../services/pokemon/index.js";
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
import { getOrCreateUser } from "../services/userService.js";


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
    const chat = await message.getChat();

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
      pokedex: (args) => this.handlePokedex(client, message, senderName, args),
      companion: () => this.handleChooseCompanion(client, message, senderName),
      trade: () => this.handleTrade(client, message, senderName, args),
      accepttrade: () => this.handleAcceptTrade(client, message, senderName, args),
      rejecttrade: () => this.handleRejectTrade(client, message, senderName),
      pendingtrades: () => this.handlePendingTrades(client, message, senderName),
      sacrificar: (args) => this.handleSacrificePokemon(client, message, senderName, args),
      sacrificiostatus: () => this.handleSacrificeStatus(client, message, senderName),
      pokesystem: () => message.reply(pokemonSystemInfo),
      levelsystem: () => handleLevelSystemToggle(message, args),
      level: () => handleLevelCommand(message),
      toprank: () => handleTopRankCommand(client, message),
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
      const phoneNumber = message.author || message.from.split('@')[0];
      const cleanPhoneNumber = phoneNumber.replace(/\D/g, '');
      const result = await getRandomPokemonNameAndImage(senderName, cleanPhoneNumber);
      if (result.error) {
        if (result.nextCaptureTime) {
          const timeUntilNextCapture = result.nextCaptureTime - new Date();
          const minutesUntilNextCapture = Math.ceil(timeUntilNextCapture / (60 * 1000));
          await message.reply(`Você atingiu o limite de capturas. Poderá capturar novamente em ${minutesUntilNextCapture} minutos.`);
        } else {
          await message.reply(result.error);
        }
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
        let caption = `Parabéns, ${senderName}! Você capturou um ${result.name} ${shinyStatus}${rarityStatus ? ` (${rarityStatus})` : ''}!`;
        caption += `\nVocê tem ${result.remainingCaptures} capturas restantes nesta hora.`;
        
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

  static async handlePokedex(client, message, senderName, args) {
    try {
      const phoneNumber = message.author || message.from.split('@')[0];
      // Remover qualquer coisa que não seja dígito
      const cleanPhoneNumber = phoneNumber.replace(/\D/g, '');
      const page = args.length > 0 ? parseInt(args[0]) : 1;
      
      const result = await getUserPokemon(senderName, cleanPhoneNumber, page);
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

  static async handleTrade(client, message, senderName, args) {
    if (args.length < 2) {
      await message.reply("Uso correto: !trade @usuário [nome do Pokémon]");
      return;
    }

    // Extrair o número do usuário marcado
    const mentionedUser = await message.getMentions();
    if (mentionedUser.length === 0) {
      await message.reply("Por favor, marque o usuário com quem deseja trocar.");
      return;
    }
    const receiverNumber = mentionedUser[0].id.user;

    // Obter o chat
    const chat = await message.getChat();
    
    // Verificar se é um grupo
    if (!chat.isGroup) {
      await message.reply("Este comando só pode ser usado em grupos.");
      return;
    }

    // Extrair o nome do Pokémon (tudo após a menção do usuário)
    const pokemonName = message.body.split('@')[1].split(' ').slice(1).join(' ').trim();

    if (!pokemonName) {
      await message.reply("Por favor, especifique o nome do Pokémon que deseja trocar.");
      return;
    }

    try {
      const senderNumber = message.author || message.from.split('@')[0];
      const senderContact = await message.getContact();
      const senderUsername = senderContact.pushname || senderName;
      
      const receiverContact = await client.getContactById(mentionedUser[0].id._serialized);
      const receiverUsername = receiverContact.pushname || receiverNumber;

      const result = await initiateTrade(senderUsername, senderNumber, receiverUsername, receiverNumber, pokemonName);
      if (result.error) {
        await message.reply(result.error);
      } else {
        await message.reply(result.message);
        // Notificar o receptor da troca
        await client.sendMessage(mentionedUser[0].id._serialized, 
          `${senderUsername} quer trocar um ${result.pokemonName} com você. Use !accepttrade [nome do seu Pokémon] para aceitar ou !rejecttrade para recusar.`);
      }
    } catch (error) {
      console.error("Erro ao iniciar troca:", error);
      await message.reply("Ocorreu um erro ao iniciar a troca. Tente novamente mais tarde.");
    }
  }

  static async handleAcceptTrade(client, message, senderName, args) {
    if (args.length < 1) {
      await message.reply("Uso correto: !accepttrade [nome do Pokémon que você oferece]");
      return;
    }

    const respondPokemonName = args.join(' ');
    const phoneNumber = message.author || message.from.split('@')[0];

    try {
      const pendingTrade = await getPendingTradeForUser(senderName, phoneNumber);
      if (!pendingTrade) {
        await message.reply("Você não tem nenhuma proposta de troca pendente.");
        return;
      }

      if (pendingTrade.isInitiator) {
        await message.reply("Você não pode aceitar uma troca que você mesmo iniciou. Aguarde a resposta do outro usuário.");
        return;
      }

      const result = await respondToTrade(senderName, phoneNumber, pendingTrade.id, true, respondPokemonName);
      if (result.error) {
        await message.reply(result.error);
      } else {
        await message.reply(result.message);
        // Notificar o iniciador da troca
        const chat = await message.getChat();
        const initiator = chat.participants.find(p => p.id.user === result.initiatorUsername || p.id.user === result.initiatorUsername.replace(/[^0-9]/g, ''));
        if (initiator) {
          await client.sendMessage(initiator.id._serialized, 
            `${senderName} aceitou sua proposta de troca! Você recebeu um ${respondPokemonName} em troca do seu ${result.initiatorPokemon}.`);
        }
      }
    } catch (error) {
      console.error("Erro ao aceitar troca:", error);
      await message.reply("Ocorreu um erro ao aceitar a troca. Tente novamente mais tarde.");
    }
  }

  static async handleRejectTrade(client, message, senderName) {
    try {
      const pendingTrade = await getPendingTradeForUser(senderName);
      if (!pendingTrade) {
        await message.reply("Você não tem nenhuma proposta de troca pendente.");
        return;
      }

      if (pendingTrade.isInitiator) {
        await message.reply("Você não pode rejeitar uma troca que você mesmo iniciou. Use !canceltrade para cancelar a troca.");
        return;
      }

      const result = await respondToTrade(senderName, pendingTrade.id, false);
      if (result.error) {
        await message.reply(result.error);
      } else {
        await message.reply(result.message);
        // Notificar o iniciador da troca
        const chat = await message.getChat();
        const initiator = chat.participants.find(p => p.id.user === result.initiatorUsername || p.id.user === result.initiatorUsername.replace(/[^0-9]/g, ''));
        if (initiator) {
          await client.sendMessage(initiator.id._serialized, 
            `${senderName} recusou sua proposta de troca para o Pokémon ${pendingTrade.pokemonOffered}.`);
        }
      }
    } catch (error) {
      console.error("Erro ao rejeitar troca:", error);
      await message.reply("Ocorreu um erro ao rejeitar a troca. Tente novamente mais tarde.");
    }
  }

  static async handlePendingTrades(client, message, senderName) {
    try {
      const pendingTrades = await getPendingTradesForUser(senderName);
      if (pendingTrades.error) {
        await message.reply(pendingTrades.error);
        return;
      }

      if (pendingTrades.length === 0) {
        await message.reply("Você não tem nenhuma troca pendente.");
        return;
      }

      let replyMessage = "Suas trocas pendentes:\n\n";
      pendingTrades.forEach((trade, index) => {
        replyMessage += `${index + 1}. ${trade.isInitiator ? 'Você ofereceu' : 'Você recebeu uma oferta de'} ${trade.pokemonOffered} ${trade.isInitiator ? 'para' : 'de'} ${trade.isInitiator ? trade.receiver : trade.initiator}\n`;
      });

      await message.reply(replyMessage);
    } catch (error) {
      console.error("Erro ao listar trocas pendentes:", error);
      await message.reply("Ocorreu um erro ao listar as trocas pendentes. Tente novamente mais tarde.");
    }
  }

  static async handleSacrificePokemon(client, message, senderName, args) {
    try {
      const phoneNumber = message.author || message.from.split('@')[0];
      const cleanPhoneNumber = phoneNumber.replace(/\D/g, '');
      const pokemonName = args.join(' ').trim();
      
      if (!pokemonName) {
        await message.reply("Por favor, especifique o nome do Pokémon que deseja sacrificar. Exemplo: !sacrificar Pikachu");
        return;
      }

      const result = await sacrificePokemon(senderName, cleanPhoneNumber, pokemonName);
      let replyMessage = result.message;

      if (result.minutesRemaining !== undefined) {
        replyMessage += `\nVocê poderá capturar novamente em ${result.minutesRemaining} minutos.`;
      }

      await message.reply(replyMessage);
    } catch (error) {
      console.error('Erro ao sacrificar Pokémon:', error);
      await message.reply('Ocorreu um erro ao sacrificar o Pokémon. Tente novamente mais tarde.');
    }
  }

  static async handleSacrificeStatus(client, message, senderName) {
    try {
      const phoneNumber = message.author || message.from.split('@')[0];
      const cleanPhoneNumber = phoneNumber.replace(/\D/g, '');
      const status = await getUserSacrificeStatus(senderName, cleanPhoneNumber);
      if (status.error) {
        await message.reply(status.error);
      } else {
        let replyMessage = `Você tem ${status.sacrificesAvailable} sacrifícios disponíveis hoje e ${status.extraCaptures} capturas extras acumuladas.`;
        
        if (status.sacrificedPokemons && status.sacrificedPokemons.length > 0) {
          replyMessage += "\n\nPokémons sacrificados hoje:";
          status.sacrificedPokemons.forEach((pokemon, index) => {
            replyMessage += `\n${index + 1}. ${pokemon}`;
          });
        } else {
          replyMessage += "\n\nVocê ainda não sacrificou nenhum Pokémon hoje.";
        }

        await message.reply(replyMessage);
      }
    } catch (error) {
      console.error('Erro ao obter status de sacrifícios:', error);
      await message.reply('Ocorreu um erro ao obter o status de sacrifícios. Tente novamente mais tarde.');
    }
  }

  static async processMessage(client, message) {
    const contact = await message.getContact();
    const senderName = contact.pushname;
    const chat = await message.getChat();
    const phoneNumber = message.author || message.from.split('@')[0];

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
    }

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