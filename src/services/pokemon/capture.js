import { getPokemon } from "pkmonjs";
import axios from 'axios';
import fs from 'fs';
import { createCanvas, loadImage } from 'canvas';
import { getRarityChance, isPokemonLegendary, isPokemonMythical } from './utils.js';
import { 
  getOrCreateUser, 
  getUserCaptureInfo, 
  updateUserCaptureInfo, 
  savePokemonToSupabase,
  supabase
} from './database.js';
import { getCompanionProgress, evolveCompanion } from './companion.js';
import { createPokedexImage } from './pokedex.js';
import { checkAndUpdateCaptureLimit, getRemainingCaptures, tradePokemonForCaptures, getTradeStatus } from './captureLimits.js';

const MAX_POKEMON_ID = 898;
const MAX_FETCH_ATTEMPTS = 5;
const SHINY_CHANCE = 1 / 4096;
const EVOLUTION_THRESHOLD = 50;

async function fetchPokemonFromPokeAPI(id) {
  try {
    const response = await axios.get(`https://pokeapi.co/api/v2/pokemon/${id}`);
    return {
      name: response.data.name,
      image: response.data.sprites.other['official-artwork'].front_default || response.data.sprites.front_default
    };
  } catch (error) {
    console.error(`Erro ao buscar Pokémon da PokeAPI:`, error);
    return null;
  }
}

export async function getRandomPokemonNameAndImage(senderName, phoneNumber) {
  try {
    const user = await getOrCreateUser(senderName, phoneNumber);
    if (!user) throw new Error('Não foi possível criar ou obter o usuário');

    const { canCapture, remainingCaptures } = await checkAndUpdateCaptureLimit(user.id, user.username);

    if (!canCapture) {
      return { 
        error: 'Você atingiu o limite diário de capturas. Tente novamente amanhã!',
        remainingCaptures
      };
    }

    let pokemon = null;
    let isShiny = false;
    let attempts = 0;
    
    while (!pokemon && attempts < MAX_FETCH_ATTEMPTS) {
      const randomId = Math.floor(Math.random() * MAX_POKEMON_ID) + 1;
      try {
        const tempPokemon = await getPokemon(randomId);
        const rarityChance = getRarityChance(tempPokemon.name);
        
        if (Math.random() < rarityChance) {
          pokemon = tempPokemon;
          isShiny = Math.random() < SHINY_CHANCE;
        }
      } catch (error) {
        console.error(`Tentativa ${attempts + 1} falhou, tentando PokeAPI...`);
        const tempPokemon = await fetchPokemonFromPokeAPI(randomId);
        if (tempPokemon) {
          const rarityChance = getRarityChance(tempPokemon.name);
          if (Math.random() < rarityChance) {
            pokemon = tempPokemon;
            isShiny = Math.random() < SHINY_CHANCE;
          }
        }
      }
      attempts++;
    }

    if (!pokemon) throw new Error('Não foi possível obter um Pokémon após várias tentativas');

    const { name, image } = pokemon;
    let imageUrl = image.default || image;

    if (isShiny) {
      const shinyImagePath = `./assets/shiny_pokemon_images/${name}.jpg`;
      if (fs.existsSync(shinyImagePath)) {
        imageUrl = shinyImagePath;
      } else {
        console.warn(`Imagem shiny não encontrada para ${name}, usando imagem normal.`);
      }
    }

    const isLegendary = isPokemonLegendary(name);
    const isMythical = isPokemonMythical(name);

    const savedPokemon = await savePokemonToSupabase(user.id, name, imageUrl, isShiny, isLegendary, isMythical);
    if (!savedPokemon) throw new Error('Falha ao salvar o Pokémon no banco de dados');

    const companion = await getCompanionProgress(user.id);
    let companionEvolution = null;
    let companionImage = null;

    if (companion) {
      companion.capture_count += 1;
      await updateUserCaptureInfo(user.id, companion.capture_count, null);

      if (companion.capture_count >= EVOLUTION_THRESHOLD) {
        const evolutionResult = await evolveCompanion(user.id);
        if (evolutionResult.error) {
          console.error('Erro ao evoluir companheiro:', evolutionResult.error);
        } else if (evolutionResult.message) {
          console.log(evolutionResult.message);
        } else {
          console.log(`Companheiro evoluiu para ${evolutionResult.evolutionName}`);
          companionEvolution = `Seu companheiro evoluiu para ${evolutionResult.evolutionName}!`;
          companionImage = evolutionResult.evolutionImage;
        }
      }
    }

    console.log(`Novo Pokémon capturado: ${name} (${isShiny ? 'Shiny' : 'Normal'})`);
    return { 
      name, 
      imageUrl, 
      isShiny,
      isLegendary,
      isMythical,
      companionEvolution,
      companionImage,
      remainingCaptures
    };
  } catch (error) {
    console.error('Erro ao obter Pokémon:', error);
    return { error: error.message || 'Erro inesperado ao obter Pokémon' };
  }
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

    const { data: pokemon, error: pokemonError } = await supabase
      .from('pokemon_generated')
      .select('*')
      .eq('user_id', user.id)
      .ilike('pokemon_name', pokemonName)
      .limit(1);

    if (pokemonError) throw pokemonError;
    if (!pokemon || pokemon.length === 0) {
      return { message: `Você não possui o Pokémon ${pokemonName} em sua coleção.` };
    }

    const { data: sacrificeStatus, error: statusError } = await supabase
      .from('user_capture_limits')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (statusError && statusError.code !== 'PGRST116') throw statusError;

    const now = new Date();
    const today = now.toISOString().split('T')[0];

    if (!sacrificeStatus || sacrificeStatus.last_trade_date !== today) {
      await supabase
        .from('user_capture_limits')
        .upsert({
          user_id: user.id,
          trades_today: 1,
          last_trade_date: today,
          extra_captures: (sacrificeStatus ? sacrificeStatus.extra_captures : 0) + 2,
          username: user.username
        });
    } else if (sacrificeStatus.trades_today >= 5) {
      return { message: 'Você já atingiu o limite diário de 5 sacrifícios.' };
    } else {
      await supabase
        .from('user_capture_limits')
        .update({
          trades_today: sacrificeStatus.trades_today + 1,
          extra_captures: sacrificeStatus.extra_captures + 2
        })
        .eq('user_id', user.id);
    }

    await supabase
      .from('pokemon_generated')
      .delete()
      .eq('id', pokemon[0].id);

    return { message: `Você sacrificou ${pokemonName} e ganhou 2 capturas extras!` };
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
        extraCaptures: sacrificeStatus ? sacrificeStatus.extra_captures : 0
      };
    } else {
      return {
        sacrificesAvailable: Math.max(0, 5 - sacrificeStatus.trades_today),
        extraCaptures: sacrificeStatus.extra_captures
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