import axios from 'axios';

/**
 * Fetches Pokémon data from the PokeAPI.
 * @param {string|number} nameOrId - The name or ID of the Pokémon.
 * @returns {object} The Pokémon data.
 * @throws {Error} If the Pokémon is not found.
 */
export async function fetchPokemonData(nameOrId) {
  try {
    const response = await axios.get(`https://pokeapi.co/api/v2/pokemon/${nameOrId.toLowerCase()}`);
    const pokemonData = response.data;

    // Fetch species data to determine rarity
    const speciesResponse = await axios.get(pokemonData.species.url);
    const speciesData = speciesResponse.data;

    return {
      id: pokemonData.id,
      name: pokemonData.name,
      image: pokemonData.sprites.other['official-artwork'].front_default,
      types: pokemonData.types.map(typeInfo => typeInfo.type.name),
      abilities: pokemonData.abilities.map(abilityInfo => abilityInfo.ability.name),
      stats: pokemonData.stats.map(statInfo => ({
        base_stat: statInfo.base_stat,
        name: statInfo.stat.name
      })),
      isLegendary: speciesData.is_legendary,
      isMythical: speciesData.is_mythical
    };
  } catch (error) {
    console.error('Erro ao buscar dados do Pokémon:', error);
    throw new Error('Pokémon não encontrado. Por favor, tente novamente.');
  }
}

/**
 * Returns the rarity label for a given Pokémon.
 * @param {object} pokemon - The Pokémon data.
 * @returns {string} The rarity label.
 */
export function getRarityLabel(pokemon) {
  if (pokemon.isMythical) return 'Mythical';
  if (pokemon.isLegendary) return 'Legendary';
  return 'Normal';
}
