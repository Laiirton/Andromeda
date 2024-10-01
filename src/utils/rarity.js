import fs from 'fs';
import path from 'path';

const legendaryPokemon = JSON.parse(fs.readFileSync(path.join('./assets/pokemons_types/legendary.txt'), 'utf8'));
const mythicalPokemon = JSON.parse(fs.readFileSync(path.join('./assets/pokemons_types/mythical.txt'), 'utf8'));

export function isPokemonLegendary(pokemonName) {
  return legendaryPokemon.includes(pokemonName.toLowerCase());
}

export function isPokemonMythical(pokemonName) {
  return mythicalPokemon.includes(pokemonName.toLowerCase());
}

export function getRarityChance(pokemonName) {
  if (isPokemonLegendary(pokemonName)) {
    return 1 / 100; // 1% de chance para lendários
  } else if (isPokemonMythical(pokemonName)) {
    return 1 / 200; // 0.5% de chance para míticos
  }
  return 1; // 100% de chance para Pokémon normais
}