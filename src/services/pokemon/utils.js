import fs from 'fs';
import path from 'path';


export function getRarityChance(pokemonName) {
  if (isPokemonLegendary(pokemonName)) {
    return 0.01; // 1% de chance para lendários
  } else if (isPokemonMythical(pokemonName)) {
    return 0.005; // 0.5% de chance para míticos
  }
  return 1; // 100% de chance para Pokémon normais
}
