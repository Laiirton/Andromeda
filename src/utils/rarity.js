import fs from 'fs';
import path from 'path';

const legendaryPokemon = JSON.parse(fs.readFileSync(path.join('./assets/pokemons_types/legendary.txt'), 'utf8'));
const mythicalPokemon = JSON.parse(fs.readFileSync(path.join('./assets/pokemons_types/mythical.txt'), 'utf8'));

/**
 * Checks if a Pokémon is legendary.
 * @param {string} pokemonName - The name of the Pokémon.
 * @returns {boolean} True if the Pokémon is legendary, false otherwise.
 */
export function isPokemonLegendary(pokemonName) {
  return legendaryPokemon.includes(pokemonName.toLowerCase());
}

/**
 * Checks if a Pokémon is mythical.
 * @param {string} pokemonName - The name of the Pokémon.
 * @returns {boolean} True if the Pokémon is mythical, false otherwise.
 */
export function isPokemonMythical(pokemonName) {
  return mythicalPokemon.includes(pokemonName.toLowerCase());
}

/**
 * Gets the rarity chance of a Pokémon.
 * @param {string} pokemonName - The name of the Pokémon.
 * @returns {number} The rarity chance of the Pokémon.
 */
export function getRarityChance(pokemonName) {
  if (isPokemonLegendary(pokemonName)) {
    return 1 / 100; // 1% chance for legendary Pokémon
  } else if (isPokemonMythical(pokemonName)) {
    return 1 / 200; // 0.5% chance for mythical Pokémon
  }
  return 1; // 100% chance for normal Pokémon
}
