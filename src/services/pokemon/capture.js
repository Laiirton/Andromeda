import { getPokemon } from "pkmonjs";
import axios from 'axios';
import fs from 'fs';
import { createCanvas, loadImage } from 'canvas';
import { getRarityChance } from './utils.js';
import { 
  getOrCreateUser, 
  getUserCaptureInfo, 
  updateUserCaptureInfo, 
  savePokemonToSupabase,
  supabase
} from './database.js';
import { getCompanionProgress, evolveCompanion } from './companion.js';
import { createPokedexImage } from './pokedex.js';
import { checkAndUpdateCaptureLimit, getRemainingCaptures, getTradeStatus, updateCapturesRemaining, sacrificePokemon as sacrificePokemonLimit } from './captureLimits.js';
import { fetchPokemonData, getRarityLabel } from './pokemonRarity.js';
import pkg from 'whatsapp-web.js';
import { addToQueue } from '../../utils/requestQueue.js';
import { generateShinyPokemon } from './shinyGenerator.js';
const { MessageMedia } = pkg;

const MAX_POKEMON_ID = 898;
const MAX_FETCH_ATTEMPTS = 5;
const SHINY_CHANCE = 1 / 4096;
const EVOLUTION_THRESHOLD = 50;

export async function getRandomPokemonNameAndImage(senderName, phoneNumber) {
  return addToQueue(async () => {
    try {
      const user = await getOrCreateUser(senderName, phoneNumber);
      if (!user) throw new Error('Não foi possível criar ou obter o usuário');

      const { canCapture, remainingCaptures, nextCaptureTime } = await checkAndUpdateCaptureLimit(user.id, user.username);

      if (!canCapture) {
        const timeUntilNextCapture = nextCaptureTime - new Date();
        const minutesUntilNextCapture = Math.ceil(timeUntilNextCapture / (60 * 1000));
        return { 
          error: `Você atingiu o limite de capturas. Poderá capturar novamente em ${minutesUntilNextCapture} minutos.`,
          remainingCaptures,
          nextCaptureTime
        };
      }

      let pokemon = null;
      let attempts = 0;
      
      while (!pokemon && attempts < MAX_FETCH_ATTEMPTS) {
        const randomId = Math.floor(Math.random() * MAX_POKEMON_ID) + 1;
        try {
          pokemon = await fetchPokemonData(randomId.toString());
          
          // Gerar shiny
          const shinyResult = await generateShinyPokemon(pokemon.name);
          
          if (shinyResult.isShiny) {
            pokemon.isShiny = true;
            pokemon.image = shinyResult.imagePath;
          }
        } catch (error) {
          console.error(`Tentativa ${attempts + 1} falhou, tentando PokeAPI...`);
        }
        attempts++;
      }

      if (!pokemon) throw new Error('Não foi possível obter um Pokémon após várias tentativas');

      const rarityLabel = getRarityLabel(pokemon);
      const pokemonStatus = pokemon.isShiny ? '✨ Shiny' : rarityLabel;

      const savedPokemon = await savePokemonToSupabase(
        user.id, 
        pokemon.name, 
        pokemon.image, 
        pokemon.isShiny || false, // Garante que isShiny seja sempre um booleano
        pokemon.isLegendary || false, // Garante que isLegendary seja sempre um booleano
        pokemon.isMythical || false // Garante que isMythical seja sempre um booleano
      );

      if (!savedPokemon) throw new Error('Falha ao salvar o Pokémon capturado');

      const companionProgress = await getCompanionProgress(user.id);
      let companionEvolution = null;
      let companionImage = null;

      if (companionProgress) {
        const newCaptureCount = companionProgress.capture_count + 1;
        if (newCaptureCount >= EVOLUTION_THRESHOLD) {
          const evolutionResult = await evolveCompanion(user.id);
          if (!evolutionResult.error) {
            companionEvolution = `Parabéns! Seu companheiro ${companionProgress.companion_name} evoluiu para ${evolutionResult.evolutionName}!`;
            companionImage = evolutionResult.evolutionImage;
          }
        } else {
          await supabase
            .from('companions')
            .update({ capture_count: newCaptureCount })
            .eq('user_id', user.id);
        }
      }

      return {
        name: pokemon.name,
        imageUrl: pokemon.image,
        pokemonStatus: pokemonStatus,
        remainingCaptures,
        companionEvolution,
        companionImage,
        count: savedPokemon.count,
        isShiny: pokemon.isShiny
      };
    } catch (error) {
      console.error('Erro ao capturar Pokémon:', error);
      return { error: error.message || 'Erro inesperado ao capturar Pokémon' };
    }
  });
}

export async function getUserPokemon(senderName, phoneNumber, page = 1, itemsPerPage = 40) {
  try {
    const user = await getOrCreateUser(senderName, phoneNumber);
    if (!user) throw new Error('Não foi possível criar ou obter o usuário');

    // Obter o total de Pokémon únicos do usuário
    const { data: uniquePokemon, error: countError } = await supabase
      .from('pokemon_generated')
      .select('pokemon_name')
      .eq('user_id', user.id)
      .order('pokemon_name');

    if (countError) throw countError;

    const uniquePokemonCount = new Set(uniquePokemon.map(p => p.pokemon_name)).size;
    const totalPages = Math.ceil(uniquePokemonCount / itemsPerPage);
    page = Math.max(1, Math.min(page, totalPages));

    // Obter os Pokémon únicos para a página atual, incluindo a contagem
    const { data, error } = await supabase
      .from('pokemon_generated')
      .select('*')
      .eq('user_id', user.id)
      .order('pokemon_name')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const uniquePokemonData = [];
    const seenPokemon = new Set();

    for (const pokemon of data) {
      if (!seenPokemon.has(pokemon.pokemon_name)) {
        seenPokemon.add(pokemon.pokemon_name);
        const count = data.filter(p => p.pokemon_name === pokemon.pokemon_name).length;
        uniquePokemonData.push({ ...pokemon, count });
      }
    }

    const paginatedData = uniquePokemonData.slice((page - 1) * itemsPerPage, page * itemsPerPage);

    console.log(`Pokémon únicos obtidos para o usuário ${senderName} (página ${page}):`, paginatedData);

    if (paginatedData.length === 0) {
      return { error: 'Nenhum Pokémon capturado ainda' };
    }

    const pokedexImage = await createPokedexImage(paginatedData, senderName, page, totalPages);

    return { 
      pokedexImages: [pokedexImage],
      pokemonCount: uniquePokemonCount,
      currentPage: page,
      totalPages: totalPages
    };
  } catch (error) {
    console.error('Erro ao obter Pokémon do usuário:', error);
    return { error: error.message || 'Erro inesperado ao obter Pokémon do usuário' };
  }
}

export async function getUserCaptureStatus(senderName, phoneNumber) {
  try {
    const user = await getOrCreateUser(senderName, phoneNumber);
    if (!user) throw new Error('Não foi possível criar ou obter o usuário');

    const remainingCaptures = await getRemainingCaptures(user.id, user.username);
    return { remainingCaptures };
  } catch (error) {
    console.error('Erro ao obter status de captura do usuário:', error);
    return { error: error.message || 'Erro inesperado ao obter status de captura' };
  }
}

export async function sacrificePokemon(senderName, phoneNumber, pokemonName) {
  try {
    const user = await getOrCreateUser(senderName, phoneNumber);
    if (!user) throw new Error('Não foi possível criar ou obter o usuário');

    // Verificar se o usuário possui o Pokémon
    const { data: pokemon, error: pokemonError } = await supabase
      .from('pokemon_generated')
      .select('*')
      .eq('user_id', user.id)
      .ilike('pokemon_name', pokemonName)
      .order('created_at', { ascending: true })
      .limit(1);

    if (pokemonError) throw pokemonError;
    if (!pokemon || pokemon.length === 0) {
      return { message: `Você não possui o Pokémon ${pokemonName} em sua coleção.` };
    }

    // Verificar limites de sacrifício
    const { data: userLimit, error: limitError } = await supabase
      .from('user_capture_limits')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (limitError) throw limitError;

    const today = new Date().toISOString().split('T')[0];
    if (userLimit.last_sacrifice_date === today && userLimit.sacrifices_today >= 5) {
      return { message: "Você já atingiu o limite máximo de sacrifícios por dia (5)." };
    }

    // Verificar se o Pokémon está em uma troca pendente
    const { data: pendingTrade, error: tradeError } = await supabase
      .from('pokemon_trades')
      .select('*')
      .eq('initiator_pokemon_id', pokemon[0].id)
      .eq('status', 'pending')
      .single();

    if (tradeError && tradeError.code !== 'PGRST116') throw tradeError;

    if (pendingTrade) {
      return { message: `Este Pokémon está em uma troca pendente e não pode ser sacrificado.` };
    }

    // Realizar o sacrifício
    const result = await sacrificePokemonLimit(user.id, user.username, pokemonName);

    if (result.success) {
      // Atualizar a contagem do Pokémon em vez de deletá-lo
      const { error: updateError } = await supabase
        .from('pokemon_generated')
        .update({ count: pokemon[0].count - 1 })
        .eq('id', pokemon[0].id);

      if (updateError) throw updateError;

      // Se a contagem chegar a zero, então deletamos o registro
      if (pokemon[0].count === 1) {
        const { error: deleteError } = await supabase
          .from('pokemon_generated')
          .delete()
          .eq('id', pokemon[0].id);

        if (deleteError) throw deleteError;
      }

      // Atualizar o contador de sacrifícios
      const { error: updateLimitError } = await supabase
        .from('user_capture_limits')
        .update({ 
          sacrifices_today: userLimit.sacrifices_today + 1,
          last_sacrifice_date: today
        })
        .eq('user_id', user.id);

      if (updateLimitError) throw updateLimitError;

      console.log('Sacrifício realizado:', result);

      return { 
        message: result.message,
        minutesRemaining: result.minutesRemaining
      };
    } else {
      return { message: result.message };
    }
  } catch (error) {
    console.error('Erro ao sacrificar Pokémon:', error);
    return { message: 'Ocorreu um erro ao sacrificar o Pokémon. Tente novamente mais tarde.' };
  }
}

export async function getUserSacrificeStatus(senderName, phoneNumber) {
  try {
    const user = await getOrCreateUser(senderName, phoneNumber);
    if (!user) throw new Error('Não foi possível criar ou obter o usuário');

    const { data: sacrificeStatus, error } = await supabase
      .from('user_capture_limits')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    const now = new Date();
    const today = now.toISOString().split('T')[0];

    if (!sacrificeStatus || sacrificeStatus.last_trade_date !== today) {
      return {
        sacrificesAvailable: 5,
        extraCaptures: sacrificeStatus ? sacrificeStatus.extra_captures : 0,
        sacrificedPokemons: []
      };
    } else {
      return {
        sacrificesAvailable: Math.max(0, 5 - (sacrificeStatus.sacrificed_pokemons ? sacrificeStatus.sacrificed_pokemons.length : 0)),
        extraCaptures: sacrificeStatus.extra_captures,
        sacrificedPokemons: sacrificeStatus.sacrificed_pokemons || []
      };
    }
  } catch (error) {
    console.error('Erro ao obter status de sacrifícios do usuário:', error);
    return { error: error.message || 'Erro inesperado ao obter status de sacrifícios' };
  }
}

export async function tradeForCaptures(senderName, phoneNumber) {
  try {
    const user = await getOrCreateUser(senderName, phoneNumber);
    if (!user) throw new Error('Não foi possível criar ou obter o usuário');

    const { data: pokemon, error: pokemonError } = await supabase
      .from('pokemon_generated')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (pokemonError) throw pokemonError;
    if (!pokemon || pokemon.length === 0) {
      return { message: 'Você não tem nenhum Pokémon para trocar.' };
    }

    const { data: tradeStatus, error: statusError } = await supabase
      .from('user_trade_status')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (statusError && statusError.code !== 'PGRST116') throw statusError;

    const now = new Date();
    const today = now.toISOString().split('T')[0];

    if (!tradeStatus || tradeStatus.last_trade_date !== today) {
      await supabase
        .from('user_trade_status')
        .upsert({
          user_id: user.id,
          trades_today: 1,
          last_trade_date: today,
          extra_captures: tradeStatus ? tradeStatus.extra_captures + 2 : 2
        });
    } else if (tradeStatus.trades_today >= 5) {
      return { message: 'Você já atingiu o limite diário de 5 trocas.' };
    } else {
      await supabase
        .from('user_trade_status')
        .update({
          trades_today: tradeStatus.trades_today + 1,
          extra_captures: tradeStatus.extra_captures + 2
        })
        .eq('user_id', user.id);
    }

    await supabase
      .from('pokemon_generated')
      .delete()
      .eq('id', pokemon[0].id);

    return { message: `Você trocou ${pokemon[0].pokemon_name} por 2 capturas extras!` };
  } catch (error) {
    console.error('Erro ao trocar Pokémon por capturas:', error);
    return { message: 'Ocorreu um erro ao realizar a troca. Tente novamente mais tarde.' };
  }
}

export async function getUserTradeStatus(senderName, phoneNumber) {
  try {
    const user = await getOrCreateUser(senderName, phoneNumber);
    if (!user) throw new Error('Não foi possível criar ou obter o usuário');

    const status = await getTradeStatus(user.id, user.username);
    return status;
  } catch (error) {
    console.error('Erro ao obter status de trocas do usuário:', error);
    return { error: error.message || 'Erro inesperado ao obter status de trocas' };
  }
}

export async function captureAllAvailable(client, message, username, phoneNumber, availableCaptures) {
  return addToQueue(async () => {
    try {
      let capturedCount = 0;
      let captureResults = [];
      let failedMessages = 0;

      for (let i = 0; i < availableCaptures; i++) {
        const result = await getRandomPokemonNameAndImage(username, phoneNumber);
        if (result.error) {
          console.error('Erro ao capturar Pokémon:', result.error);
          break;
        }
        capturedCount++;
        captureResults.push(result);
      }

      const user = await getOrCreateUser(username, phoneNumber);
      if (!user) {
        throw new Error('Não foi possível criar ou obter o usuário');
      }

      const remainingCaptures = await updateCapturesRemaining(user.id, capturedCount);

      let captureMessage = `@${username} capturou ${capturedCount} Pokémon:\n\n`;

      for (const result of captureResults) {
        try {
          const media = await MessageMedia.fromUrl(result.imageUrl);
          const caption = `${result.name} ${result.pokemonStatus}`;
          await client.sendMessage(message.from, media, { caption });
        } catch (error) {
          console.error(`Erro ao enviar imagem para ${result.name}:`, error);
          failedMessages++;
          captureMessage += `- ${result.name} ${result.pokemonStatus} (Falha ao enviar imagem)\n`;
        }
      }

      captureMessage += `\nVocê tem ${remainingCaptures} capturas restantes.`;

      const chat = await message.getChat();
      await chat.sendMessage(captureMessage, { mentions: [await chat.getContact()] });
      console.log(`Captura em massa concluída para ${username}. Capturados: ${capturedCount}, Falhas: ${failedMessages}`);

      return {
        message: captureMessage,
        capturedCount,
        remainingCaptures,
        failedMessages
      };
    } catch (error) {
      console.error("Erro ao capturar todos os Pokémon disponíveis:", error);
      await message.reply("Ocorreu um erro ao capturar os Pokémon. Tente novamente mais tarde.");
      return { error: "Ocorreu um erro ao capturar os Pokémon. Tente novamente mais tarde." };
    }
  });
}
