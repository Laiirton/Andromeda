import { getPokemon } from "pkmonjs";
import fs from 'fs/promises';
import path from 'path';
import { createClient } from "@supabase/supabase-js";

// Conexão com o supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function savePokemonToSupabase(userName, pokemonName, pokemonImage) {
  try {
    const { data, error } = await supabase
      .from('pokemon_generated')
      .insert([
        { username: userName, pokemon_name: pokemonName, pokemon_image_url: pokemonImage }
      ]);
    
    if (error) throw error;
    console.log('Pokémon salvo com sucesso', data);
  } catch (error) {
    console.error('Erro ao salvar Pokémon:', error);
  }
}

async function getOrCreateUser(username) {
  try {
    // Verifica se o usuário já existe
    let { data: user, error } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .single();

    if (error) {
      if (error.code === '42501') {
        console.error('Erro de permissão ao acessar a tabela users. Verifique as políticas de segurança no Supabase.');
      } else if (error.code !== 'PGRST116') {
        throw error;
      }
    }

    if (!user) {
      // Se o usuário não existe, tenta criar um novo
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({ username })
        .select('id')
        .single();

      if (insertError) {
        if (insertError.code === '42501') {
          console.error('Erro de permissão ao inserir na tabela users. Verifique as políticas de segurança no Supabase.');
        }
        throw insertError;
      }
      user = newUser;
    }

    return user ? user.id : null;
  } catch (error) {
    console.error('Erro ao obter ou criar usuário:', error);
    return null;
  }
}

export async function getRandomPokemonNameAndImage(senderName) {
  try {
    const randomId = Math.floor(Math.random() * 898) + 1;
    const randomPokemon = await getPokemon(randomId);
    const name = randomPokemon.name;
    const imageUrl = randomPokemon.image.default;
    console.log(`Pokémon: ${name}`);
    console.log(`Image: ${imageUrl}`);

    try {
      // Obter ou criar o usuário
      const userId = await getOrCreateUser(senderName);

      if (userId) {
        // Save to Supabase
        await savePokemonToSupabase(senderName, name, imageUrl);
      } else {
        console.log('Não foi possível criar ou obter o usuário. O Pokémon não será salvo no banco de dados.');
      }
    } catch (dbError) {
      console.error('Erro ao interagir com o banco de dados:', dbError);
      // Continua a execução mesmo se houver erro no banco de dados
    }

    // Create or append to the user's file
    const fileName = `${senderName}.txt`;
    const filePath = path.join('./src/media/pokemon', fileName);
    const pokemonEntry = `${name}\n`;

    try {
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.appendFile(filePath, pokemonEntry);
      console.log(`File updated: ${filePath}`);
    } catch (fileError) {
      console.error('Error writing to file:', fileError);
    }
    return { name, imageUrl };
  } catch (error) {
    console.error('Error fetching random Pokémon:', error);
    throw error;
  }
}
