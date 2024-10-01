import { getPokemon } from "pkmonjs";
import { createClient } from "@supabase/supabase-js";
import { createCanvas, loadImage } from 'canvas';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

// Configuração do Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const CAPTURE_LIMIT = 5;
const COOLDOWN_PERIOD = 60 * 60 * 2000; 
const MAX_POKEMON_ID = 898;
const MAX_FETCH_ATTEMPTS = 5;
const SHINY_CHANCE = 1 / 4096; // Chance de 1 em 4096 para um Pokémon ser shiny
const EVOLUTION_THRESHOLD = 50; // Número de capturas necessárias para evoluir

async function savePokemonToSupabase(userId, pokemonName, pokemonImage, isShiny) {
  try {
    const { data, error } = await supabase
      .from('pokemon_generated')
      .insert([{ 
        user_id: userId, 
        pokemon_name: pokemonName, 
        pokemon_image_url: pokemonImage,
        is_shiny: isShiny
      }]);
    
    if (error) throw error;
    
    console.log('Pokémon salvo com sucesso:', { userId, pokemonName, pokemonImage, isShiny });
    return { userId, pokemonName, pokemonImage, isShiny };
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

async function getCompanionProgress(userId) {
  try {
    const { data, error } = await supabase
      .from('companions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle(); // Usa maybeSingle() em vez de single()

    if (error) throw error;

    return data; // Pode ser null se não encontrar nenhum companheiro
  } catch (error) {
    console.error('Erro ao obter progresso do companheiro:', error);
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
    for (let attempts = 0; attempts < MAX_FETCH_ATTEMPTS && !pokemon; attempts++) {
      const randomId = Math.floor(Math.random() * MAX_POKEMON_ID) + 1;
      try {
        pokemon = await getPokemon(randomId);
        isShiny = Math.random() < SHINY_CHANCE;
      } catch (error) {
        console.error(`Tentativa ${attempts + 1} falhou, tentando PokeAPI...`);
        pokemon = await fetchPokemonFromPokeAPI(randomId);
        isShiny = Math.random() < SHINY_CHANCE;
      }
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

    const savedPokemon = await savePokemonToSupabase(userId, name, imageUrl, isShiny);
    if (!savedPokemon) throw new Error('Falha ao salvar o Pokémon no banco de dados');

    captureInfo.capture_count += 1;
    captureInfo.last_capture_time = currentTime.toISOString();
    await updateUserCaptureInfo(userId, captureInfo.capture_count, captureInfo.last_capture_time);

    // Atualiza o progresso do companheiro
    const companion = await getCompanionProgress(userId);
    let companionEvolution = null;
    let companionImage = null;

    if (companion) {
      companion.capture_count += 1;
      await supabase
        .from('companions')
        .update({ capture_count: companion.capture_count })
        .eq('user_id', userId);

      // Verifica se o companheiro pode evoluir
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

    // Obter o total de Pokémon do usuário
    const { count, error: countError } = await supabase
      .from('pokemon_generated')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (countError) throw countError;

    // Calcular o total de páginas
    const totalPages = Math.ceil(count / itemsPerPage);

    // Ajustar a página se necessário
    page = Math.max(1, Math.min(page, totalPages));

    // Obter os Pokémon para a página atual
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

async function createPokedexImage(pokemonList, username, currentPage, totalPages) {
  const MAX_IMAGE_SIZE = 15 * 1024 * 1024; // 15MB em bytes
  const BACKGROUND_WIDTH = 3000;
  const BACKGROUND_HEIGHT = 2000;
  let POKEMON_PER_ROW = 8;
  let POKEMON_SIZE = 200;
  let PADDING = 40;
  let NAME_HEIGHT = 60;
  let TITLE_HEIGHT = 120; // Altura reservada para o título
  let quality = 1;

  let imageBuffer;
  do {
    const ROW_HEIGHT = POKEMON_SIZE + NAME_HEIGHT + PADDING;
    const CONTENT_WIDTH = (POKEMON_SIZE + PADDING) * POKEMON_PER_ROW;
    const CONTENT_HEIGHT = ROW_HEIGHT * Math.ceil(pokemonList.length / POKEMON_PER_ROW);
    const SCALE_FACTOR = Math.min(
      (BACKGROUND_WIDTH - 2 * PADDING) / CONTENT_WIDTH,
      (BACKGROUND_HEIGHT - TITLE_HEIGHT - 2 * PADDING) / CONTENT_HEIGHT
    );
    
    const CANVAS_WIDTH = BACKGROUND_WIDTH;
    const CANVAS_HEIGHT = BACKGROUND_HEIGHT;

    const canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
    const ctx = canvas.getContext('2d');

    // Carrega e desenha o background
    const backgroundImage = await loadImage('./src/media/pokedex.jpg');
    ctx.drawImage(backgroundImage, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Adiciona o título com o nome do usuário
    ctx.font = `bold ${Math.floor(80 * SCALE_FACTOR)}px Arial`;
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 8;
    const title = `Pokédex de ${username} - Página ${currentPage} de ${totalPages}`;
    ctx.strokeText(title, CANVAS_WIDTH / 2, 40);
    ctx.fillText(title, CANVAS_WIDTH / 2, 40);

    // Calcula o ponto de início para centralizar o conteúdo horizontalmente e começar logo abaixo do título
    const startX = (CANVAS_WIDTH - CONTENT_WIDTH * SCALE_FACTOR) / 2;
    const startY = TITLE_HEIGHT + PADDING;

    ctx.save();
    ctx.translate(startX, startY);
    ctx.scale(SCALE_FACTOR, SCALE_FACTOR);

    for (let i = 0; i < pokemonList.length; i++) {
      const pokemon = pokemonList[i];
      const x = (i % POKEMON_PER_ROW) * (POKEMON_SIZE + PADDING);
      const y = Math.floor(i / POKEMON_PER_ROW) * ROW_HEIGHT;

      try {
        const image = await loadImage(pokemon.pokemon_image_url);
        
        // Desenha uma sombra suave
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 15;
        ctx.shadowOffsetX = 5;
        ctx.shadowOffsetY = 5;
        
        // Desenha um círculo branco como fundo para o Pokémon
        ctx.beginPath();
        ctx.arc(x + POKEMON_SIZE / 2, y + POKEMON_SIZE / 2, POKEMON_SIZE / 2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fill();

        // Reseta a sombra antes de desenhar a imagem
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        // Calcula as dimensões para manter a proporção da imagem
        const aspectRatio = image.width / image.height;
        let drawWidth = POKEMON_SIZE;
        let drawHeight = POKEMON_SIZE;
        let offsetX = 0;
        let offsetY = 0;

        if (aspectRatio > 1) {
          // Imagem mais larga que alta
          drawHeight = POKEMON_SIZE / aspectRatio;
          offsetY = (POKEMON_SIZE - drawHeight) / 2;
        } else {
          // Imagem mais alta que larga
          drawWidth = POKEMON_SIZE * aspectRatio;
          offsetX = (POKEMON_SIZE - drawWidth) / 2;
        }

        // Desenha a imagem do Pokémon mantendo a proporção
        ctx.drawImage(image, x + offsetX, y + offsetY, drawWidth, drawHeight);

        // Configura o estilo do texto
        ctx.font = `bold ${Math.max(12, Math.floor(18 * SCALE_FACTOR))}px Arial`;
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        // Adiciona um contorno ao texto para melhor legibilidade
        const pokemonName = pokemon.pokemon_name.charAt(0).toUpperCase() + pokemon.pokemon_name.slice(1);
        const displayName = pokemon.is_shiny ? `${pokemonName} ✨` : pokemonName;
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 4;
        ctx.strokeText(displayName, x + POKEMON_SIZE / 2, y + POKEMON_SIZE + 10, POKEMON_SIZE);
        ctx.fillText(displayName, x + POKEMON_SIZE / 2, y + POKEMON_SIZE + 10, POKEMON_SIZE);

      } catch (error) {
        console.error(`Erro ao carregar imagem para ${pokemon.pokemon_name}:`, error);
      }
    }

    ctx.restore();

    // Gera a imagem com a qualidade atual
    imageBuffer = canvas.toBuffer('image/jpeg', { quality });

    // Se a imagem ainda for muito grande, reduz a qualidade ou o tamanho
    if (imageBuffer.length > MAX_IMAGE_SIZE) {
      if (quality > 0.3) {
        quality -= 0.1;
      } else {
        POKEMON_SIZE *= 0.9;
        PADDING *= 0.9;
        NAME_HEIGHT *= 0.9;
        POKEMON_PER_ROW = Math.floor(POKEMON_PER_ROW * 1.1);
        quality = 1;
      }
    }
  } while (imageBuffer.length > MAX_IMAGE_SIZE);

  console.log(`Tamanho final da imagem: ${imageBuffer.length} bytes`);
  return imageBuffer;
}

async function selectCompanion(userId, companionName) {
  try {
    // Verifica se o Pokémon está na Pokédex do usuário
    const { data: userPokemon, error: pokemonError } = await supabase
      .from('pokemon_generated')
      .select('*')
      .eq('user_id', userId)
      .eq('pokemon_name', companionName.toLowerCase())
      .limit(1); // Adicionamos um limite de 1 resultado

    if (pokemonError) throw pokemonError;

    if (!userPokemon || userPokemon.length === 0) {
      return { error: 'Você ainda não capturou este Pokémon. Capture-o primeiro para escolhê-lo como companheiro.' };
    }

    // Verifica se o usuário já tem um companheiro
    const { data: existingCompanion, error: checkError } = await supabase
      .from('companions')
      .select('*')
      .eq('user_id', userId)
      .limit(1); // Adicionamos um limite de 1 resultado

    if (checkError && checkError.code !== 'PGRST116') throw checkError;

    if (existingCompanion && existingCompanion.length > 0) {
      // Atualiza o companheiro existente
      const { data, error } = await supabase
        .from('companions')
        .update({ 
          companion_name: companionName.toLowerCase(),
          evolution_stage: 1,
          capture_count: 0
        })
        .eq('user_id', userId);

      if (error) throw error;

      console.log('Companheiro atualizado com sucesso:', { userId, companionName });
      return { 
        userId, 
        companionName: companionName.toLowerCase(),
        companionImage: userPokemon[0].pokemon_image_url,
        message: `Seu companheiro foi atualizado para ${companionName}. O contador de evolução foi resetado.`
      };
    } else {
      // Insere o novo companheiro
      const { data, error } = await supabase
        .from('companions')
        .insert([{ 
          user_id: userId, 
          companion_name: companionName.toLowerCase(),
          evolution_stage: 1,
          capture_count: 0
        }]);

      if (error) throw error;

      console.log('Companheiro selecionado com sucesso:', { userId, companionName });
      return { 
        userId, 
        companionName: companionName.toLowerCase(),
        companionImage: userPokemon[0].pokemon_image_url,
        message: `Parabéns! Você escolheu ${companionName} como seu companheiro!`
      };
    }
  } catch (error) {
    console.error('Erro ao selecionar companheiro:', error);
    return { error: error.message || 'Erro ao selecionar companheiro' };
  }
}

async function evolveCompanion(userId) {
  try {
    const companion = await getCompanionProgress(userId);
    if (!companion) throw new Error('Companheiro não encontrado');

    const newStage = companion.evolution_stage + 1;

    const evolutionName = getEvolutionName(companion.companion_name, newStage);
    if (!evolutionName) {
      console.log('Companheiro já está na sua forma final');
      return { message: 'Seu companheiro já está na sua forma final!' };
    }

    // Busca a imagem da evolução na PokeAPI
    const response = await axios.get(`https://pokeapi.co/api/v2/pokemon/${evolutionName.toLowerCase()}`);
    const evolutionImage = response.data.sprites.other['official-artwork'].front_default || response.data.sprites.front_default;

    // Atualiza o companheiro
    const { data, error } = await supabase
      .from('companions')
      .update({ 
        evolution_stage: newStage, 
        capture_count: 0, 
        companion_name: evolutionName,
        companion_image: evolutionImage
      })
      .eq('user_id', userId);

    if (error) throw error;

    // Adiciona a evolução à Pokédex do usuário
    const { error: pokemonError } = await supabase
      .from('pokemon_generated')
      .insert([{ 
        user_id: userId, 
        pokemon_name: evolutionName.toLowerCase(), 
        pokemon_image_url: evolutionImage,
        is_shiny: false // Assumimos que evoluções não são shiny por padrão
      }]);

    if (pokemonError) throw pokemonError;

    console.log('Companheiro evoluído com sucesso:', { userId, newStage, evolutionName, evolutionImage });
    return { userId, newStage, evolutionName, evolutionImage };
  } catch (error) {
    console.error('Erro ao evoluir companheiro:', error);
    return { error: error.message || 'Erro ao evoluir companheiro' };
  }
}

async function loadEvolutions() {
  const evolutions = {};
  const generations = 9; // Supondo que você tenha 9 gerações

  for (let i = 1; i <= generations; i++) {
    const filePath = path.join(`./assets/pokemons_evolutions/generation_${i}.txt`);
    const data = fs.readFileSync(filePath, 'utf8');
    const generationEvolutions = JSON.parse(data);
    Object.assign(evolutions, generationEvolutions);
  }

  return evolutions;
}

let evolutionsData = null;

// Carrega os dados de evolução ao iniciar o módulo
(async () => {
  evolutionsData = await loadEvolutions();
})();

function getEvolutionName(companionName, stage) {
  if (!evolutionsData) {
    console.error('Dados de evolução não carregados');
    return null;
  }

  const evolutionStages = evolutionsData[companionName.toLowerCase()];
  if (!evolutionStages || stage > evolutionStages.length) return null;

  return evolutionStages[stage - 1];
}

// Atualize a função chooseCompanion para usar a nova lógica
export async function chooseCompanion(senderName, companionName) {
  try {
    const userId = await getOrCreateUser(senderName);
    if (!userId) throw new Error('Não foi possível criar ou obter o usuário');

    const result = await selectCompanion(userId, companionName);
    if (result.error) {
      return { error: result.error };
    }

    return {
      message: result.message,
      imageUrl: result.companionImage
    };
  } catch (error) {
    console.error('Erro ao escolher companheiro:', error);
    return { error: error.message || 'Erro inesperado ao escolher companheiro' };
  }
}