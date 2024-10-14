import pkg from 'whatsapp-web.js';
const { MessageMedia } = pkg;
import {
  getRandomPokemonNameAndImage,
  getUserPokemon,
  chooseCompanion,
  initiateTrade,
  respondToTrade,
  getPendingTradeForUser,
  getPendingTradesForUser,
  sacrificePokemon,
  getUserSacrificeStatus,
  captureAllAvailable,
  getOrCreateUser
} from "../services/pokemon/index.js";
import { resetCaptureTime } from '../services/pokemon/adminCommands.js';
import { getCapturesRemaining } from "../services/pokemon/captureLimits.js";
import { fetchPokemonData } from '../services/pokemon/pokemonRarity.js';
import { listPokemonByRarity, listRarityOptions } from '../services/pokemon/pokemonListCommands.js';

class PokemonController {
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
        let caption = `Parabéns, ${senderName}! Você capturou um ${result.name} ${result.pokemonStatus}!`;
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
      console.error("Erro ao capturar Pokémon:", error);
      await message.reply("Ocorreu um erro ao capturar o Pokémon. Tente novamente mais tarde.");
    }
  }

  static async handlePokedex(client, message, senderName, args) {
    try {
      const phoneNumber = message.author || message.from.split('@')[0];
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

    const mentionedUser = await message.getMentions();
    if (mentionedUser.length === 0) {
      await message.reply("Por favor, marque o usuário com quem deseja trocar.");
      return;
    }
    const receiverNumber = mentionedUser[0].id.user;

    const chat = await message.getChat();
    if (!chat.isGroup) {
      await message.reply("Este comando só pode ser usado em grupos.");
      return;
    }

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
      const phoneNumber = message.author || message.from.split('@')[0];
      const pendingTrade = await getPendingTradeForUser(senderName, phoneNumber);
      if (!pendingTrade) {
        await message.reply("Você não tem nenhuma proposta de troca pendente.");
        return;
      }

      if (pendingTrade.isInitiator) {
        await message.reply("Você não pode rejeitar uma troca que você mesmo iniciou. Use !canceltrade para cancelar a troca.");
        return;
      }

      const result = await respondToTrade(senderName, phoneNumber, pendingTrade.id, false);
      if (result.error) {
        await message.reply(result.error);
      } else {
        await message.reply(result.message);
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
      const phoneNumber = message.author || message.from.split('@')[0];
      const pendingTrades = await getPendingTradesForUser(senderName, phoneNumber);
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

  static async handleCaptureAll(client, message, senderName) {
    try {
      const phoneNumber = message.author || message.from.split('@')[0];
      const cleanPhoneNumber = phoneNumber.replace(/\D/g, '');

      // Obter o usuário primeiro
      const user = await getOrCreateUser(senderName, cleanPhoneNumber);
      if (!user) {
        throw new Error('Não foi possível criar ou obter o usuário');
      }

      // Verificar o número de capturas restantes
      const { remainingCaptures, nextCaptureTime } = await getCapturesRemaining(user.id, senderName);

      if (remainingCaptures <= 0) {
        if (nextCaptureTime) {
          const timeUntilNextCapture = nextCaptureTime - new Date();
          const minutesUntilNextCapture = Math.ceil(timeUntilNextCapture / (60 * 1000));
          await message.reply(`Você não tem mais capturas disponíveis. Poderá capturar novamente em ${minutesUntilNextCapture} minutos.`);
        } else {
          await message.reply("Você não tem mais capturas disponíveis. Aguarde até que seu limite seja renovado.");
        }
        return;
      }

      // Enviar mensagem de início da captura em massa
      await message.reply(`Iniciando captura em massa para ${senderName}. Capturando ${remainingCaptures} Pokémon...`);

      // Chamar captureAllAvailable com o número de capturas restantes
      const result = await captureAllAvailable(client, message, senderName, cleanPhoneNumber, remainingCaptures);

      if (result.error) {
        await message.reply(result.error);
      } else {
        // A mensagem final já foi enviada pela função captureAllAvailable
        console.log(`Captura em massa concluída para ${senderName}. Capturados: ${result.capturedCount}, Falhas: ${result.failedMessages}`);
      }
    } catch (error) {
      console.error("Erro ao capturar todos os Pokémon disponíveis:", error);
      await message.reply("Ocorreu um erro ao tentar capturar todos os Pokémon disponíveis. Tente novamente mais tarde.");
    }
  }

  static async handleResetCaptureTime(client, message, senderName) {
    try {
      const senderNumber = message.author || message.from.split('@')[0];
      const mentionedUsers = await message.getMentions();

      if (mentionedUsers.length === 0) {
        // Se nenhum usuário for mencionado, tenta resetar o próprio tempo do remetente
        const result = await resetCaptureTime(senderNumber, senderNumber);
        await message.reply(result.message || result.error);
      } else {
        // Se um usuário for mencionado, tenta resetar o tempo dele
        const targetUser = mentionedUsers[0];
        const targetNumber = targetUser.id.user;
        const result = await resetCaptureTime(senderNumber, targetNumber);
        await message.reply(result.message || result.error);
      }
    } catch (error) {
      console.error("Erro ao resetar tempo de captura:", error);
      await message.reply("Desculpe, ocorreu um erro inesperado ao tentar resetar o tempo de captura. Tente novamente mais tarde.");
    }
  }

  static async handlePokemonStats(client, message, senderName, args) {
    try {
      let pokemonName;

      if (args.length > 0) {
        // Se argumentos foram fornecidos, use-os como nome do Pokémon
        pokemonName = args.join(' ').toLowerCase();
      } else {
        // Se não há argumentos, tente obter o nome do Pokémon da mensagem citada
        const quotedMessage = await message.getQuotedMessage();
        if (quotedMessage) {
          const match = quotedMessage.body.match(/Parabéns,.*! Você capturou um (.*?)(✨)?\s/);
          if (match) {
            pokemonName = match[1].toLowerCase();
          }
        }
      }

      if (!pokemonName) {
        await message.reply("Por favor, forneça o nome de um Pokémon ou cite uma mensagem de captura.");
        return;
      }

      const pokemonData = await fetchPokemonData(pokemonName);

      let statsMessage = `*Estatísticas de ${pokemonData.name.charAt(0).toUpperCase() + pokemonData.name.slice(1)}*\n\n`;
      statsMessage += `*Tipo(s):* ${pokemonData.types.join(', ')}\n`;
      statsMessage += `*Habilidades:* ${pokemonData.abilities.join(', ')}\n\n`;
      statsMessage += "*Estatísticas base:*\n";
      pokemonData.stats.forEach(stat => {
        statsMessage += `${stat.name.charAt(0).toUpperCase() + stat.name.slice(1)}: ${stat.base_stat}\n`;
      });
      statsMessage += `\n*Raridade:* ${pokemonData.isLegendary ? 'Lendário' : pokemonData.isMythical ? 'Mítico' : 'Normal'}`;

      await client.sendMessage(message.from, statsMessage);

    } catch (error) {
      console.error("Erro ao buscar estatísticas do Pokémon:", error);
      await message.reply("Ocorreu um erro ao buscar as estatísticas do Pokémon. Verifique se o nome está correto e tente novamente.");
    }
  }

  static async handlePokemonRarityList(message, senderName, args) {
    try {
      const phoneNumber = message.author || message.from.split('@')[0];
      const rarity = args.join(' ').trim().toLowerCase();

      if (!rarity) {
        const rarityOptions = listRarityOptions();
        await message.reply(rarityOptions);
      } else if (['legendary', 'mythical', 'normal'].includes(rarity)) {
        const pokemonList = await listPokemonByRarity(senderName, phoneNumber, rarity);
        await message.reply(pokemonList);
      } else {
        await message.reply('Raridade inválida. Use !pokerarity para ver as opções disponíveis.');
      }
    } catch (error) {
      console.error('Erro ao listar Pokémon por raridade:', error);
      await message.reply('Ocorreu um erro ao listar seus Pokémon. Tente novamente mais tarde.');
    }
  }
}

export default PokemonController;