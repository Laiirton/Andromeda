import { supabase } from './database.js';
import { getOrCreateUser } from './database.js';

async function getPokemonByRarity(userId, rarity) {
  let query = supabase
    .from('pokemon_generated')
    .select('*')
    .eq('user_id', userId);

  switch (rarity.toLowerCase()) {
    case 'legendary':
      query = query.eq('is_legendary', true);
      break;
    case 'mythical':
      query = query.eq('is_mythical', true);
      break;
    case 'normal':
      query = query.eq('is_legendary', false).eq('is_mythical', false);
      break;
    default:
      throw new Error('Raridade inválida');
  }

  const { data, error } = await query;

  if (error) {
    console.error('Erro ao buscar Pokémon:', error);
    throw error;
  }

  return data;
}

export async function listPokemonByRarity(senderName, phoneNumber, rarity) {
  try {
    const user = await getOrCreateUser(senderName, phoneNumber);
    if (!user) {
      throw new Error('Não foi possível criar ou obter o usuário');
    }

    const pokemonList = await getPokemonByRarity(user.id, rarity);

    if (pokemonList.length === 0) {
      return `Você não possui nenhum Pokémon ${rarity}.`;
    }

    const groupedPokemon = pokemonList.reduce((acc, pokemon) => {
      if (!acc[pokemon.pokemon_name]) {
        acc[pokemon.pokemon_name] = {
          count: 0,
          shinyCount: 0
        };
      }
      acc[pokemon.pokemon_name].count += pokemon.count;
      if (pokemon.is_shiny) {
        acc[pokemon.pokemon_name].shinyCount += pokemon.count;
      }
      return acc;
    }, {});

    let message = `Seus Pokémon ${rarity}:\n\n`;
    Object.entries(groupedPokemon).forEach(([name, { count, shinyCount }]) => {
      message += `${name.charAt(0).toUpperCase() + name.slice(1)}: ${count}`;
      if (shinyCount > 0) {
        message += ` (${shinyCount} shiny)`;
      }
      message += '\n';
    });

    return message;
  } catch (error) {
    console.error('Erro ao listar Pokémon por raridade:', error);
    return 'Ocorreu um erro ao listar seus Pokémon. Tente novamente mais tarde.';
  }
}

export function listRarityOptions() {
  return 'Opções de raridade disponíveis:\n\n' +
         'legendary - para listar Pokémon lendários\n' +
         'mythical - para listar Pokémon míticos\n' +
         'normal - para listar Pokémon não lendários e não míticos';
}
