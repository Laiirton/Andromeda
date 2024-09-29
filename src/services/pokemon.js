import { getPokemon } from "pkmonjs";
import { createClient } from "@supabase/supabase-js";

// Conexão com o supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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

export async function getRandomPokemonNameAndImage(senderName) {
  try {
    const userId = await getOrCreateUser(senderName);
    if (!userId) {
      console.error('Não foi possível criar ou obter o usuário');
      return null;
    }

    const randomId = Math.floor(Math.random() * 898) + 1;
    const randomPokemon = await getPokemon(randomId);
    const name = randomPokemon.name;
    const imageUrl = randomPokemon.image.default;
    console.log(`Novo Pokémon gerado: ${name}`);

    const savedPokemon = await savePokemonToSupabase(userId, name, imageUrl);
    if (savedPokemon) {
      console.log('Pokémon salvo com sucesso no banco de dados');
    } else {
      console.error('Falha ao salvar o Pokémon no banco de dados');
    }

    return { name, imageUrl };
  } catch (error) {
    console.error('Erro inesperado ao obter Pokémon:', error);
    return null;
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
