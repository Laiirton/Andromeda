import { getPokemon } from "pkmonjs";
import fs from 'fs/promises';
import path from 'path';

export async function getRandomPokemonNameAndImage(senderName) {
  try {
    const randomId = Math.floor(Math.random() * 898) + 1;
    const randomPokemon = await getPokemon(randomId);
    const name = randomPokemon.name;
    const imageUrl = randomPokemon.image.default;
    console.log(`Pokémon: ${name}`);
    console.log(`Image: ${imageUrl}`);

    // Create or append to the user's file
    const fileName = `${senderName}.txt`;
    const filePath = path.join('./src/media/pokemon', fileName);
    const pokemonEntry = `${name}\n`;

    try {
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      const fileStats = await fs.stat(filePath).catch(() => null);
      
      if (!fileStats) {
        await fs.writeFile(filePath, pokemonEntry);
        console.log(`File created: ${filePath}`);
      } else {
        await fs.appendFile(filePath, pokemonEntry);
        console.log(`File updated: ${filePath}`);
      }
    } catch (fileError) {
      console.error('Error writing to file:', fileError);
    }
    return { name, imageUrl };
  } catch (error) {
    console.error('Error fetching random Pokémon:', error);
    throw error;
  }
}

export async function getUserPokemon(senderName) {
  try {
    const fileName = `${senderName}.txt`;
    const filePath = path.join('./src/media/pokemon', fileName);

    const fileContent = await fs.readFile(filePath, 'utf-8');
    const pokemonList = fileContent.trim().split('\n');

    console.log(`Pokémon list for ${senderName}:`, pokemonList);
    return pokemonList;
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log(`No Pokémon file found for ${senderName}`);
      return [];
    }
    console.error('Error reading user Pokémon file:', error);
    throw error;
  }
}
