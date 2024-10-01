// Lista de Pokémon lendários e míticos
const legendaryPokemon = [
  "articuno", "zapdos", "moltres", "mewtwo", "mew",
  // Adicione mais Pokémon lendários aqui...
];

const mythicalPokemon = [
  "celebi", "jirachi", "deoxys", "manaphy", "darkrai",
  // Adicione mais Pokémon míticos aqui...
];

export function getRarityChance(pokemonName) {
  if (isPokemonLegendary(pokemonName) || isPokemonMythical(pokemonName)) {
    return 0.05; // 5% de chance para Pokémon lendários e míticos
  }
  return 1; // 100% de chance para Pokémon comuns
}

export function isPokemonLegendary(pokemonName) {
  return legendaryPokemon.includes(pokemonName.toLowerCase());
}

export function isPokemonMythical(pokemonName) {
  return mythicalPokemon.includes(pokemonName.toLowerCase());
}