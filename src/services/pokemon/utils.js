import fs from 'fs';
import path from 'path';

/**
 * Get the rarity chance for a given Pokémon.
 * @param {string} pokemonName - The name of the Pokémon.
 * @returns {number} The rarity chance.
 */
export function getRarityChance(pokemonName) {
  if (isPokemonLegendary(pokemonName)) {
    return 0.01; // 1% de chance para lendários
  } else if (isPokemonMythical(pokemonName)) {
    return 0.005; // 0.5% de chance para míticos
  }
  return 1; // 100% de chance para Pokémon normais
}

/**
 * Check if a Pokémon is legendary.
 * @param {string} pokemonName - The name of the Pokémon.
 * @returns {boolean} True if the Pokémon is legendary, false otherwise.
 */
function isPokemonLegendary(pokemonName) {
  const legendaryPokemon = [
    'articuno', 'zapdos', 'moltres', 'mewtwo', 'raikou', 'entei', 'suicune',
    'lugia', 'ho-oh', 'regirock', 'regice', 'registeel', 'latias', 'latios',
    'kyogre', 'groudon', 'rayquaza', 'uxie', 'mesprit', 'azelf', 'dialga',
    'palkia', 'heatran', 'regigigas', 'giratina', 'cresselia', 'cobalion',
    'terrakion', 'virizion', 'tornadus', 'thundurus', 'reshiram', 'zekrom',
    'landorus', 'kyurem', 'xerneas', 'yveltal', 'zygarde', 'tapu koko',
    'tapu lele', 'tapu bulu', 'tapu fini', 'cosmog', 'cosmoem', 'solgaleo',
    'lunala', 'nihilego', 'buzzwole', 'pheromosa', 'xurkitree', 'celesteela',
    'kartana', 'guzzlord', 'necrozma', 'stakataka', 'blacephalon', 'zacian',
    'zamazenta', 'eternatus', 'kubfu', 'urshifu', 'regieleki', 'regidrago',
    'glastrier', 'spectrier', 'calyrex'
  ];
  return legendaryPokemon.includes(pokemonName.toLowerCase());
}

/**
 * Check if a Pokémon is mythical.
 * @param {string} pokemonName - The name of the Pokémon.
 * @returns {boolean} True if the Pokémon is mythical, false otherwise.
 */
function isPokemonMythical(pokemonName) {
  const mythicalPokemon = [
    'mew', 'celebi', 'jirachi', 'deoxys', 'phione', 'manaphy', 'darkrai',
    'shaymin', 'arceus', 'victini', 'keldeo', 'meloetta', 'genesect',
    'diancie', 'hoopa', 'volcanion', 'magearna', 'marshadow', 'zeraora',
    'meltan', 'melmetal', 'zarude', 'glastrier', 'spectrier', 'calyrex'
  ];
  return mythicalPokemon.includes(pokemonName.toLowerCase());
}
