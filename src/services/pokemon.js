import { getPokemon } from "pkmonjs";
import { createClient } from "@supabase/supabase-js";

// Conexão com o supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const CAPTURE_LIMIT = 5;
const COOLDOWN_PERIOD = 60 * 60 * 1000; // 1 hora em milissegundos

async function savePokemonToSupabase(userId, pokemonName, pokemonImage) {
  try {
    const { data, error } = await supabase
      .from('pokemon_generated')
      .insert([
        { user_id: userId, pokemon_name: pokemonName, pokemon_image_url: pokemonImage }
      ]);
    
    if (error) {
      console.error('Erro ao salvar Pokémon:', error);
      return null;
    }
    console.log('Pokémon salvo com sucesso:', { userId, pokemonName, pokemonImage });
    return { userId, pokemonName, pokemonImage };
  } catch (error) {
    console.error('Erro inesperado ao salvar Pokémon:', error);
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

    if (error && error.code !== 'PGRST116') {
      console.error('Erro ao buscar usuário:', error);
      return null;
    }

    if (!user) {
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({ username })
        .select('id')
        .single();

      if (insertError) {
        console.error('Erro ao criar novo usuário:', insertError);
        return null;
      }
      user = newUser;
    }

    return user.id;
  } catch (error) {
    console.error('Erro inesperado ao obter ou criar usuário:', error);
    return null;
  }
}

async function getPokemonFromDatabase(userId) {
  try {
    const { data, error } = await supabase
      .from('pokemon_generated')
      .select('pokemon_name, pokemon_image_url')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Erro ao buscar Pokémon do banco de dados:', error);
      return null;
    }
    return data.length > 0 ? data[0] : null;
  } catch (error) {
    console.error('Erro inesperado ao buscar Pokémon do banco de dados:', error);
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

    if (error && error.code !== 'PGRST116') {
      console.error('Erro ao buscar informações de captura:', error);
      return null;
    }

    if (!data) {
      const { data: newData, error: insertError } = await supabase
        .from('user_capture_info')
        .insert({ user_id: userId, capture_count: 0, last_capture_time: new Date().toISOString() })
        .select()
        .single();

      if (insertError) {
        console.error('Erro ao criar informações de captura:', insertError);
        return null;
      }

      return newData;
    }

    return data;
  } catch (error) {
    console.error('Erro inesperado ao obter informações de captura:', error);
    return null;
  }
}

async function updateUserCaptureInfo(userId, captureCount, lastCaptureTime) {
  try {
    const { error } = await supabase
      .from('user_capture_info')
      .update({ capture_count: captureCount, last_capture_time: lastCaptureTime })
      .eq('user_id', userId);

    if (error) {
      console.error('Erro ao atualizar informações de captura:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Erro inesperado ao atualizar informações de captura:', error);
    return false;
  }
}

export async function getRandomPokemonNameAndImage(senderName) {
  try {
    const userId = await getOrCreateUser(senderName);
    if (!userId) {
      console.error('Não foi possível criar ou obter o usuário');
      return { error: 'Erro ao obter usuário' };
    }

    const captureInfo = await getUserCaptureInfo(userId);
    if (!captureInfo) {
      return { error: 'Erro ao obter informações de captura' };
    }

    const currentTime = new Date();
    const lastCaptureTime = new Date(captureInfo.last_capture_time);
    const timeSinceLastCapture = currentTime - lastCaptureTime;

    if (timeSinceLastCapture < COOLDOWN_PERIOD && captureInfo.capture_count >= CAPTURE_LIMIT) {
      const remainingTime = Math.ceil((COOLDOWN_PERIOD - timeSinceLastCapture) / 60000); // Tempo restante em minutos
      return { error: `Você atingiu o limite de capturas. Tente novamente em ${remainingTime} minutos.` };
    }

    if (timeSinceLastCapture >= COOLDOWN_PERIOD) {
      captureInfo.capture_count = 0;
    }

    const randomId = Math.floor(Math.random() * 898) + 1;
    const randomPokemon = await getPokemon(randomId);
    const name = randomPokemon.name;
    const imageUrl = randomPokemon.image.default;

    const savedPokemon = await savePokemonToSupabase(userId, name, imageUrl);
    if (!savedPokemon) {
      return { error: 'Falha ao salvar o Pokémon no banco de dados' };
    }

    captureInfo.capture_count += 1;
    captureInfo.last_capture_time = currentTime.toISOString();
    await updateUserCaptureInfo(userId, captureInfo.capture_count, captureInfo.last_capture_time);

    console.log(`Novo Pokémon capturado: ${name}. Capturas restantes: ${CAPTURE_LIMIT - captureInfo.capture_count}`);
    return { name, imageUrl, capturesRemaining: CAPTURE_LIMIT - captureInfo.capture_count };
  } catch (error) {
    console.error('Erro inesperado ao obter Pokémon:', error);
    return { error: 'Erro inesperado ao obter Pokémon' };
  }
}

export async function getUserPokemon(senderName) {
  try {
    const userId = await getOrCreateUser(senderName);
    if (!userId) {
      console.error('Usuário não encontrado');
      return [];
    }

    const { data, error } = await supabase
      .from('pokemon_generated')
      .select('pokemon_name')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Erro ao obter Pokémon do usuário:', error);
      return [];
    }

    console.log(`Pokémon obtidos para o usuário ${senderName}:`, data);

    return data.map(pokemon => pokemon.pokemon_name);
  } catch (error) {
    console.error('Erro inesperado ao obter Pokémon do usuário:', error);
    return [];
  }
}
