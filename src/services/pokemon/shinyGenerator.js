import fs from 'fs/promises';
import path from 'path';

const SHINY_CHANCE = 1 / 4096; // Chance original de encontrar um Pokémon shiny
const SHINY_IMAGES_PATH = path.join(process.cwd(), 'assets', 'shiny_pokemon_images');

/**
 * Generates a shiny Pokémon with a given name.
 * @param {string} pokemonName - The name of the Pokémon.
 * @returns {object} The result containing whether the Pokémon is shiny and the image path.
 */
export async function generateShinyPokemon(pokemonName) {
  console.log('Gerando Pokémon shiny para:', pokemonName);
  const isShiny = Math.random() < SHINY_CHANCE;
  console.log('É shiny?', isShiny);

  if (isShiny) {
    try {
      // Normaliza o nome do Pokémon removendo hífens e convertendo para minúsculas
      const normalizedName = pokemonName.toLowerCase().replace(/-/g, '');
      const imagePath = path.join(SHINY_IMAGES_PATH, `${normalizedName}.jpg`);
      console.log('Tentando acessar imagem shiny:', imagePath);
      await fs.access(imagePath); // Verifica se o arquivo existe
      console.log('Imagem shiny encontrada:', imagePath);
      return {
        isShiny: true,
        imagePath: imagePath
      };
    } catch (error) {
      console.error(`Imagem shiny não encontrada para ${pokemonName}:`, error);
      // Se a imagem shiny não for encontrada, retornamos não-shiny
      return {
        isShiny: false,
        imagePath: null
      };
    }
  }

  console.log('Retornando Pokémon não-shiny');
  return {
    isShiny: false,
    imagePath: null
  };
}
