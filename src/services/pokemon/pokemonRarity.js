import axios from 'axios';

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

export function getRarityLabel(pokemon) {
  if (pokemon.isMythical) return 'Mythical';
  if (pokemon.isLegendary) return 'Legendary';
  return 'Normal';
}