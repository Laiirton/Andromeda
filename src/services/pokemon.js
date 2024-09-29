import { getPokemon } from "pkmonjs";
import { createClient } from "@supabase/supabase-js";
import { createCanvas, loadImage } from 'canvas';
import axios from 'axios';

// Configuração do Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const CAPTURE_LIMIT = 5;
const COOLDOWN_PERIOD = 60 * 60 * 1000; // 1 hora em milissegundos
const MAX_POKEMON_ID = 898;
const MAX_FETCH_ATTEMPTS = 5;

async function savePokemonToSupabase(userId, pokemonName, pokemonImage) {
  try {
    const { data, error } = await supabase
      .from('pokemon_generated')
      .insert([{ user_id: userId, pokemon_name: pokemonName, pokemon_image_url: pokemonImage }]);
    
    if (error) throw error;
    
    console.log('Pokémon salvo com sucesso:', { userId, pokemonName, pokemonImage });
    return { userId, pokemonName, pokemonImage };
  } catch (error) {
    console.error('Erro ao salvar Pokémon:', error);
    return null;
  }
}

async function getOrCreateUser(username) {
  try {
    let { data: user, error } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    if (!user) {
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({ username })
        .select('id')
        .single();

      if (insertError) throw insertError;
      user = newUser;
    }

    return user.id;
  } catch (error) {
    console.error('Erro ao obter ou criar usuário:', error);
    return null;
  }
}

async function getUserCaptureInfo(userId) {
  try {
    const { data, error } = await supabase
      .from('user_capture_info')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    if (!data) {
      const { data: newData, error: insertError } = await supabase
        .from('user_capture_info')
        .insert({ user_id: userId, capture_count: 0, last_capture_time: new Date().toISOString() })
        .select()
        .single();

      if (insertError) throw insertError;
      return newData;
    }

    return data;
  } catch (error) {
    console.error('Erro ao obter informações de captura:', error);
    return null;
  }
}

async function updateUserCaptureInfo(userId, captureCount, lastCaptureTime) {
  try {
    const { error } = await supabase
      .from('user_capture_info')
      .update({ capture_count: captureCount, last_capture_time: lastCaptureTime })
      .eq('user_id', userId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Erro ao atualizar informações de captura:', error);
    return false;
  }
}

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
    for (let attempts = 0; attempts < MAX_FETCH_ATTEMPTS && !pokemon; attempts++) {
      const randomId = Math.floor(Math.random() * MAX_POKEMON_ID) + 1;
      try {
        pokemon = await getPokemon(randomId);
      } catch (error) {
        console.error(`Tentativa ${attempts + 1} falhou, tentando PokeAPI...`);
        pokemon = await fetchPokemonFromPokeAPI(randomId);
      }
    }

    if (!pokemon) throw new Error('Não foi possível obter um Pokémon após várias tentativas');

    const { name, image } = pokemon;
    const imageUrl = image.default || image;

    const savedPokemon = await savePokemonToSupabase(userId, name, imageUrl);
    if (!savedPokemon) throw new Error('Falha ao salvar o Pokémon no banco de dados');

    captureInfo.capture_count += 1;
    captureInfo.last_capture_time = currentTime.toISOString();
    await updateUserCaptureInfo(userId, captureInfo.capture_count, captureInfo.last_capture_time);

    console.log(`Novo Pokémon capturado: ${name}. Capturas restantes: ${CAPTURE_LIMIT - captureInfo.capture_count}`);
    return { name, imageUrl, capturesRemaining: CAPTURE_LIMIT - captureInfo.capture_count };
  } catch (error) {
    console.error('Erro ao obter Pokémon:', error);
    return { error: error.message || 'Erro inesperado ao obter Pokémon' };
  }
}

export async function getUserPokemon(senderName) {
  try {
    const userId = await getOrCreateUser(senderName);
    if (!userId) throw new Error('Usuário não encontrado');

    const { data, error } = await supabase
      .from('pokemon_generated')
      .select('pokemon_name, pokemon_image_url')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    console.log(`Pokémon obtidos para o usuário ${senderName}:`, data);

    if (data.length === 0) {
      return { error: 'Nenhum Pokémon capturado ainda' };
    }

    const pokedexImage = await createPokedexImage(data);
    return { 
      pokedexImage,
      pokemonCount: data.length
    };
  } catch (error) {
    console.error('Erro ao obter Pokémon do usuário:', error);
    return { error: error.message || 'Erro inesperado ao obter Pokémon do usuário' };
  }
}

async function createPokedexImage(pokemonList) {
  const POKEMON_PER_ROW = 5;
  const POKEMON_SIZE = 80;
  const PADDING = 10;
  const ROW_HEIGHT = 100;

  const canvas = createCanvas(500, ROW_HEIGHT * Math.ceil(pokemonList.length / POKEMON_PER_ROW));
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#f0f0f0';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < pokemonList.length; i++) {
    const pokemon = pokemonList[i];
    const x = (i % POKEMON_PER_ROW) * (POKEMON_SIZE + PADDING) + PADDING;
    const y = Math.floor(i / POKEMON_PER_ROW) * ROW_HEIGHT + PADDING;

    try {
      const image = await loadImage(pokemon.pokemon_image_url);
      ctx.drawImage(image, x, y, POKEMON_SIZE, POKEMON_SIZE);

      ctx.font = '10px Arial';
      ctx.fillStyle = 'black';
      ctx.textAlign = 'center';
      ctx.fillText(pokemon.pokemon_name, x + POKEMON_SIZE / 2, y + POKEMON_SIZE + PADDING);
    } catch (error) {
      console.error(`Erro ao carregar imagem para ${pokemon.pokemon_name}:`, error);
    }
  }

  return canvas.toBuffer('image/png');
}
