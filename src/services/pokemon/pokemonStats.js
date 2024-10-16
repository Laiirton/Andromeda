import { supabase } from './database.js';
import { createPokedexImage } from './pokedex.js';
import { getOrCreateUser } from './database.js';

const ITEMS_PER_PAGE = 40;

export async function getAllUserPokemon(senderName, phoneNumber, page = 1) {
  try {
    console.log(`Iniciando getAllUserPokemon para ${senderName} (${phoneNumber})`);

    const cleanPhoneNumber = phoneNumber.replace(/\D/g, '');
    if (!cleanPhoneNumber) {
      throw new Error('Número de telefone inválido');
    }

    let { data: user, error: userError } = await supabase
      .from('users')
      .select('id, username')
      .eq('phone_number', cleanPhoneNumber)
      .single();

    if (userError && userError.code !== 'PGRST116') {
      console.error('Erro ao buscar usuário:', userError);
      throw userError;
    }

    if (!user) {
      const cleanUsername = senderName.replace(/[^a-zA-Z0-9\s]/g, '').trim().slice(0, 50);
      if (!cleanUsername) {
        throw new Error('Nome de usuário inválido');
      }
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({ username: cleanUsername, phone_number: cleanPhoneNumber })
        .select('id, username')
        .single();

      if (createError) {
        console.error('Erro ao criar novo usuário:', createError);
        throw createError;
      }
      user = newUser;
    }

    console.log(`Usuário encontrado/criado: ${user.username} (ID: ${user.id})`);

    // Buscar todos os Pokémon do usuário
    const { data: allPokemon, error: pokemonError, count } = await supabase
      .from('pokemon_generated')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id);

    if (pokemonError) {
      console.error('Erro ao buscar Pokémon do usuário:', pokemonError);
      throw pokemonError;
    }

    // Agrupar Pokémon por nome e somar contagens
    const groupedPokemon = allPokemon.reduce((acc, pokemon) => {
      const key = `${pokemon.pokemon_name}_${pokemon.is_shiny}`;
      if (!acc[key]) {
        acc[key] = { ...pokemon, total_count: 0 };
      }
      acc[key].total_count += pokemon.count;
      return acc;
    }, {});

    const uniquePokemon = Object.values(groupedPokemon);
    uniquePokemon.sort((a, b) => a.pokemon_name.localeCompare(b.pokemon_name));

    const totalPages = Math.ceil(uniquePokemon.length / ITEMS_PER_PAGE);
    page = Math.max(1, Math.min(page, totalPages));

    const startIndex = (page - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const pokemonForPage = uniquePokemon.slice(startIndex, endIndex);

    console.log(`${pokemonForPage.length} Pokémon únicos encontrados para ${user.username} (Página ${page}/${totalPages})`);

    if (pokemonForPage.length === 0) {
      return { message: 'Você ainda não capturou nenhum Pokémon.' };
    }

    const pokedexImage = await createPokedexImage(pokemonForPage, user.username, page, totalPages);

    return { 
      pokedexImage,
      pokemonCount: uniquePokemon.length,
      currentPage: page,
      totalPages: totalPages,
      username: user.username
    };
  } catch (error) {
    console.error('Erro em getAllUserPokemon:', error);
    return { error: 'Ocorreu um erro ao buscar seus Pokémon. Por favor, tente novamente mais tarde.' };
  }
}

export async function getPokemonByRarity(senderName, phoneNumber, rarity) {
  try {
    const user = await getOrCreateUser(senderName, phoneNumber);
    if (!user) throw new Error('Não foi possível criar ou obter o usuário');

    let query = supabase
      .from('pokemon_generated')
      .select('*')
      .eq('user_id', user.id);

    switch (rarity.toLowerCase()) {
      case 'mythical':
        query = query.eq('is_mythical', true);
        break;
      case 'legendary':
        query = query.eq('is_legendary', true);
        break;
      case 'shiny':
        query = query.eq('is_shiny', true);
        break;
      case 'normal':
        query = query.eq('is_mythical', false).eq('is_legendary', false).eq('is_shiny', false);
        break;
      default:
        return { error: 'Raridade inválida. Use: mythical, legendary, shiny, ou normal.' };
    }

    const { data: pokemonList, error } = await query.order('pokemon_name');

    if (error) throw error;

    if (pokemonList.length === 0) {
      return { message: `Você ainda não capturou nenhum Pokémon ${rarity}.` };
    }

    let message = `Pokémon ${rarity} de ${senderName}:\n\n`;
    pokemonList.forEach(pokemon => {
      message += `- ${pokemon.pokemon_name} (x${pokemon.count})\n`;
    });

    return { message };
  } catch (error) {
    console.error('Erro ao obter Pokémon por raridade:', error);
    return { error: error.message || 'Erro inesperado ao obter Pokémon por raridade' };
  }
}
