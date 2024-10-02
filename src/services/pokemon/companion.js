import { supabase } from './database.js';
import { getEvolutionName } from './evolution.js';
import axios from 'axios';
import { getOrCreateUser } from './database.js';

export async function getCompanionProgress(userId) {
  try {
    const { data, error } = await supabase
      .from('companions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Erro ao obter progresso do companheiro:', error);
    return null;
  }
}

export async function selectCompanion(userId, companionName) {
  try {
    const { data: userPokemon, error: pokemonError } = await supabase
      .from('pokemon_generated')
      .select('*')
      .eq('user_id', userId)
      .eq('pokemon_name', companionName.toLowerCase())
      .limit(1);

    if (pokemonError) throw pokemonError;

    if (!userPokemon || userPokemon.length === 0) {
      return { error: 'Você ainda não capturou este Pokémon. Capture-o primeiro para escolhê-lo como companheiro.' };
    }

    const { data: existingCompanion, error: checkError } = await supabase
      .from('companions')
      .select('*')
      .eq('user_id', userId)
      .limit(1);

    if (checkError && checkError.code !== 'PGRST116') throw checkError;

    if (existingCompanion && existingCompanion.length > 0) {
      const { data, error } = await supabase
        .from('companions')
        .update({ 
          companion_name: companionName.toLowerCase(),
          evolution_stage: 1,
          capture_count: 0
        })
        .eq('user_id', userId);

      if (error) throw error;

      console.log('Companheiro atualizado com sucesso:', { userId, companionName });
      return { 
        userId, 
        companionName: companionName.toLowerCase(),
        companionImage: userPokemon[0].pokemon_image_url,
        message: `Seu companheiro foi atualizado para ${companionName}. O contador de evolução foi resetado.`
      };
    } else {
      const { data, error } = await supabase
        .from('companions')
        .insert([{ 
          user_id: userId, 
          companion_name: companionName.toLowerCase(),
          evolution_stage: 1,
          capture_count: 0
        }]);

      if (error) throw error;

      console.log('Companheiro selecionado com sucesso:', { userId, companionName });
      return { 
        userId, 
        companionName: companionName.toLowerCase(),
        companionImage: userPokemon[0].pokemon_image_url,
        message: `Parabéns! Você escolheu ${companionName} como seu companheiro!`
      };
    }
  } catch (error) {
    console.error('Erro ao selecionar companheiro:', error);
    return { error: error.message || 'Erro ao selecionar companheiro' };
  }
}

export async function evolveCompanion(userId) {
  try {
    const companion = await getCompanionProgress(userId);
    if (!companion) throw new Error('Companheiro não encontrado');

    const newStage = companion.evolution_stage + 1;

    const evolutionName = getEvolutionName(companion.companion_name, newStage);
    if (!evolutionName) {
      console.log('Companheiro já está na sua forma final');
      return { message: 'Seu companheiro já está na sua forma final!' };
    }

    const response = await axios.get(`https://pokeapi.co/api/v2/pokemon/${evolutionName.toLowerCase()}`);
    const evolutionImage = response.data.sprites.other['official-artwork'].front_default || response.data.sprites.front_default;

    const { data, error } = await supabase
      .from('companions')
      .update({ 
        evolution_stage: newStage, 
        capture_count: 0, 
        companion_name: evolutionName,
        companion_image: evolutionImage
      })
      .eq('user_id', userId);

    if (error) throw error;

    const { error: pokemonError } = await supabase
      .from('pokemon_generated')
      .insert([{ 
        user_id: userId, 
        pokemon_name: evolutionName.toLowerCase(), 
        pokemon_image_url: evolutionImage,
        is_shiny: false
      }]);

    if (pokemonError) throw pokemonError;

    console.log('Companheiro evoluído com sucesso:', { userId, newStage, evolutionName, evolutionImage });
    return { userId, newStage, evolutionName, evolutionImage };
  } catch (error) {
    console.error('Erro ao evoluir companheiro:', error);
    return { error: error.message || 'Erro ao evoluir companheiro' };
  }
}

export async function chooseCompanion(senderName, phoneNumber, companionName) {
  try {
    const user = await getOrCreateUser(senderName, phoneNumber);
    if (!user) throw new Error('Não foi possível criar ou obter o usuário');

    const result = await selectCompanion(user.id, companionName);
    if (result.error) {
      return { error: result.error };
    }

    return {
      message: result.message,
      imageUrl: result.companionImage
    };
  } catch (error) {
    console.error('Erro ao escolher companheiro:', error);
    return { error: error.message || 'Erro inesperado ao escolher companheiro' };
  }
}