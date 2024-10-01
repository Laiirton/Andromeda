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

const CAPTURE_LIMIT = 5;
const COOLDOWN_PERIOD = 60 * 60 * 2000; 
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

export async function getRandomPokemonNameAndImage(senderName) {
  try {
    const userId = await getOrCreateUser(senderName);
    if (!userId) throw new Error('Não foi possível criar ou obter o usuário');

    const captureInfo = await getUserCaptureInfo(userId);
    if (!captureInfo) throw new Error('Erro ao obter informações de captura');

    const currentTime = new Date();
    const lastCaptureTime = new Date(captureInfo.last_capture_time);
    const timeSinceLastCapture = currentTime - lastCaptureTime;

    if (timeSinceLastCapture < COOLDOWN_PERIOD && captureInfo.capture_count >= CAPTURE_LIMIT) {
      const remainingTime = Math.ceil((COOLDOWN_PERIOD - timeSinceLastCapture) / 60000);
      return { error: `Você atingiu o limite de capturas. Tente novamente em ${remainingTime} minutos.` };
    }

    if (timeSinceLastCapture >= COOLDOWN_PERIOD) {
      captureInfo.capture_count = 0;
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

    const savedPokemon = await savePokemonToSupabase(userId, name, imageUrl, isShiny, isLegendary, isMythical);
    if (!savedPokemon) throw new Error('Falha ao salvar o Pokémon no banco de dados');

    captureInfo.capture_count += 1;
    captureInfo.last_capture_time = currentTime.toISOString();
    await updateUserCaptureInfo(userId, captureInfo.capture_count, captureInfo.last_capture_time);

    const companion = await getCompanionProgress(userId);
    let companionEvolution = null;
    let companionImage = null;

    if (companion) {
      companion.capture_count += 1;
      await updateUserCaptureInfo(userId, companion.capture_count, null);

      if (companion.capture_count >= EVOLUTION_THRESHOLD) {
        const evolutionResult = await evolveCompanion(userId);
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

    console.log(`Novo Pokémon capturado: ${name} (${isShiny ? 'Shiny' : 'Normal'}). Capturas restantes: ${CAPTURE_LIMIT - captureInfo.capture_count}`);
    return { 
      name, 
      imageUrl, 
      capturesRemaining: CAPTURE_LIMIT - captureInfo.capture_count, 
      isShiny,
      isLegendary,
      isMythical,
      companionEvolution,
      companionImage
    };
  } catch (error) {
    console.error('Erro ao obter Pokémon:', error);
    return { error: error.message || 'Erro inesperado ao obter Pokémon' };
  }
}

export async function getUserPokemon(senderName, page = 1, itemsPerPage = 40) {
  try {
    const userId = await getOrCreateUser(senderName);
    if (!userId) throw new Error('Usuário não encontrado');

    const { count, error: countError } = await supabase
      .from('pokemon_generated')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (countError) throw countError;

    const totalPages = Math.ceil(count / itemsPerPage);
    page = Math.max(1, Math.min(page, totalPages));

    const { data, error } = await supabase
      .from('pokemon_generated')
      .select('pokemon_name, pokemon_image_url, is_shiny')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .range((page - 1) * itemsPerPage, page * itemsPerPage - 1);

    if (error) throw error;

    console.log(`Pokémon obtidos para o usuário ${senderName} (página ${page}):`, data);

    if (data.length === 0) {
      return { error: 'Nenhum Pokémon capturado ainda' };
    }

    const pokedexImage = await createPokedexImage(data, senderName, page, totalPages);

    return { 
      pokedexImages: [pokedexImage],
      pokemonCount: count,
      currentPage: page,
      totalPages: totalPages
    };
  } catch (error) {
    console.error('Erro ao obter Pokémon do usuário:', error);
    return { error: error.message || 'Erro inesperado ao obter Pokémon do usuário' };
  }
}