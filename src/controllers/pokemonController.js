import pkg from 'whatsapp-web.js';
const { MessageMedia } = pkg;
import {
  getRandomPokemonNameAndImage,
  chooseCompanion,
  initiateTrade,
  respondToTrade,
  getPendingTradeForUser,
  getPendingTradesForUser,
  tradeForCaptures,
  getUserSacrificeStatus,
  sacrificePokemon,
  getUserTradeStatus,
  captureAllAvailable,
  getOrCreateUser,
  getCapturesRemaining,
  getAllUserPokemon,
  getPokemonByRarity
} from '../services/pokemon/index.js';
import { resetCaptureTime } from '../services/pokemon/adminCommands.js';

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

  static async handleChooseCompanion(client, message, senderName) {
    const args = message.body.split(' ').slice(1);
    if (args.length === 0) {
      await message.reply("Por favor, especifique o nome do Pokémon que deseja escolher como companheiro.");
      return;
    }

    const companionName = args.join(' ');
    const phoneNumber = message.author || message.from.split('@')[0];

    try {
      const result = await chooseCompanion(senderName, phoneNumber, companionName);
      if (result.error) {
        await message.reply(result.error);
      } else {
        await message.reply(result.message);
        if (result.imageUrl) {
          const media = await MessageMedia.fromUrl(result.imageUrl);
          await client.sendMessage(message.from, media, { caption: `Seu novo companheiro: ${companionName}` });
        }
      }
    } catch (error) {
      console.error("Erro ao escolher companheiro:", error);
      await message.reply("Ocorreu um erro ao escolher o companheiro. Tente novamente mais tarde.");
    }
  }

  static async handleTrade(client, message, senderName, args) {
    if (args.length < 2) {
      await message.reply("Uso correto: !trade @usuário [nome do Pokémon]");
      return;
    }

    const mentionedUsers = await message.getMentions();
    if (mentionedUsers.length === 0) {
      await message.reply("Você precisa mencionar um usuário para iniciar uma troca.");
      return;
    }

    const receiverUser = mentionedUsers[0];
    const pokemonName = args.slice(1).join(' ');
    const initiatorPhoneNumber = message.author || message.from.split('@')[0];

    try {
      const result = await initiateTrade(senderName, initiatorPhoneNumber, receiverUser.pushname, receiverUser.id.user, pokemonName);
      if (result.error) {
        await message.reply(result.error);
      } else {
        await message.reply(result.message);
        await client.sendMessage(receiverUser.id._serialized, 
          `${senderName} quer trocar um ${result.pokemonName} com você. Use !accepttrade ou !rejecttrade para responder.`);
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
    const phoneNumber = message.author || message.from.split('@')[0];

    try {
      const pendingTrade = await getPendingTradeForUser(senderName, phoneNumber);
      if (!pendingTrade) {
        await message.reply("Você não tem nenhuma proposta de troca pendente.");
        return;
      }

      if (pendingTrade.isInitiator) {
        await message.reply("Você não pode rejeitar uma troca que você mesmo iniciou. Use !canceltrade para cancelar.");
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
          await client.sendMessage(initiator.id._serialized, `${senderName} rejeitou sua proposta de troca.`);
        }
      }
    } catch (error) {
      console.error("Erro ao rejeitar troca:", error);
      await message.reply("Ocorreu um erro ao rejeitar a troca. Tente novamente mais tarde.");
    }
  }

  static async handlePendingTrades(client, message, senderName) {
    const phoneNumber = message.author || message.from.split('@')[0];

    try {
      const user = await getOrCreateUser(senderName, phoneNumber);
      if (!user) {
        await message.reply("Não foi possível encontrar seu usuário. Por favor, tente novamente.");
        return;
      }

      const pendingTrades = await getPendingTradesForUser(user.id);
      if (pendingTrades.error) {
        await message.reply(pendingTrades.error);
        return;
      }

      if (pendingTrades.length === 0) {
        await message.reply("Você não tem nenhuma troca pendente no momento.");
      } else {
        let replyMessage = "Suas trocas pendentes:\n\n";
        pendingTrades.forEach((trade, index) => {
          replyMessage += `${index + 1}. ${trade.isInitiator ? 'Você ofereceu' : trade.initiator + ' ofereceu'} ${trade.pokemonOffered} para ${trade.isInitiator ? trade.receiver : 'você'}\n`;
        });
        await message.reply(replyMessage);
      }
    } catch (error) {
      console.error("Erro ao listar trocas pendentes:", error);
      await message.reply("Ocorreu um erro ao listar as trocas pendentes. Tente novamente mais tarde.");
    }
  }

  static async handleSacrificePokemon(client, message, senderName, args) {
    try {
      const phoneNumber = message.author || (message.from ? message.from.split('@')[0] : null);
      if (!phoneNumber) {
        console.error('Não foi possível obter o número de telefone do remetente');
        await client.sendMessage(message.from, 'Ocorreu um erro ao identificar seu número. Por favor, tente novamente.');
        return;
      }

      const pokemonName = args.join(' ').trim();

      if (!pokemonName) {
        await client.sendMessage(message.from, 'Por favor, especifique o nome do Pokémon que deseja sacrificar.');
        return;
      }

      const result = await sacrificePokemon(senderName, phoneNumber, pokemonName);

      if (result.message) {
        await client.sendMessage(message.from, result.message);
        if (result.minutesRemaining) {
          await client.sendMessage(message.from, `Você poderá capturar novamente em ${result.minutesRemaining} minutos.`);
        }
      } else {
        await client.sendMessage(message.from, 'Ocorreu um erro ao sacrificar o Pokémon. Tente novamente mais tarde.');
      }
    } catch (error) {
      console.error('Erro ao sacrificar Pokémon:', error);
      await client.sendMessage(message.from, 'Ocorreu um erro ao sacrificar o Pokémon. Tente novamente mais tarde.');
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

  static async handlePokedex(client, message, senderName, args) {
    try {
      console.log(`Iniciando handlePokedex para ${senderName}`);
      const contact = await message.getContact();
      const phoneNumber = contact.id.user;
      console.log(`Número de telefone do usuário: ${phoneNumber}`);
      
      const page = args[0] ? parseInt(args[0]) : 1;
      const result = await getAllUserPokemon(senderName, phoneNumber, page);
      
      if (result.error) {
        console.error(`Erro retornado por getAllUserPokemon: ${result.error}`);
        await message.reply(result.error);
        return;
      }
      
      if (result.message) {
        console.log(`Mensagem retornada por getAllUserPokemon: ${result.message}`);
        await message.reply(result.message);
        return;
      }
      
      if (!result.pokedexImage) {
        console.error('Imagem da Pokédex não gerada');
        await message.reply('Desculpe, não foi possível gerar sua Pokédex no momento. Tente novamente mais tarde.');
        return;
      }

      const media = new MessageMedia('image/png', result.pokedexImage.toString('base64'));
      await client.sendMessage(message.from, media, {
        caption: `Pokédex de ${result.username} - Página ${result.currentPage}/${result.totalPages} - Total de Pokémon: ${result.pokemonCount}`
      });
      console.log(`Pokédex enviada com sucesso para ${senderName}`);
    } catch (error) {
      console.error('Erro ao obter Pokédex:', error);
      await message.reply('Ocorreu um erro inesperado ao obter sua Pokédex. Por favor, tente novamente mais tarde.');
    }
  }

  static async handlePokemonRarityList(message, senderName, args) {
    try {
      const phoneNumber = message.author || message.from.split('@')[0];
      const rarity = args.join(' ').trim().toLowerCase();

      if (!rarity) {
        await message.reply('Por favor, especifique uma raridade: mythical, legendary, shiny, ou normal.');
        return;
      }

      const result = await getPokemonByRarity(senderName, phoneNumber, rarity);
      if (result.error) {
        await message.reply(result.error);
        return;
      }
      await message.reply(result.message);
    } catch (error) {
      console.error('Erro ao listar Pokémon por raridade:', error);
      await message.reply('Ocorreu um erro ao listar seus Pokémon. Tente novamente mais tarde.');
    }
  }
}

export default PokemonController;
