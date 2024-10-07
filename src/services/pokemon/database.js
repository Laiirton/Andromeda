import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function getOrCreateUser(username, phoneNumber) {
  try {
    // Limpa o número de telefone, removendo caracteres não numéricos
    const cleanPhoneNumber = phoneNumber.replace(/\D/g, '');

    if (!cleanPhoneNumber || cleanPhoneNumber.length < 10) {
      console.error('Número de telefone inválido:', phoneNumber);
      return null;
    }

    // Primeiro, tenta encontrar o usuário pelo número de telefone limpo
    let { data: user, error } = await supabase
      .from('users')
      .select('id, username, phone_number')
      .eq('phone_number', cleanPhoneNumber)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    if (!user) {
      // Se não encontrar, cria um novo usuário com o nome fornecido pelo WhatsApp
      const cleanUsername = username ? username.replace(/[^a-zA-Z0-9\s]/g, '').trim().slice(0, 50) : 'Usuário WhatsApp';
      
      ({ data: user, error } = await supabase
        .from('users')
        .insert({ username: cleanUsername, phone_number: cleanPhoneNumber })
        .select('id, username, phone_number')
        .single());

      if (error) {
        if (error.code === '23505') { // Código de erro para violação de unicidade
          console.error('Usuário já existe com este número de telefone');
          return null;
        }
        throw error;
      }
    } else if (user.username !== username) {
      // Atualiza o nome de usuário se for diferente do fornecido pelo WhatsApp
      const cleanUsername = username ? username.replace(/[^a-zA-Z0-9\s]/g, '').trim().slice(0, 50) : user.username;
      
      ({ data: user, error } = await supabase
        .from('users')
        .update({ username: cleanUsername })
        .eq('id', user.id)
        .select('id, username, phone_number')
        .single());

      if (error) throw error;
    }

    return user;
  } catch (error) {
    console.error('Erro ao obter ou criar usuário:', error);
    return null;
  }
}

export async function getUserCaptureInfo(userId) {
  try {
    const { data, error } = await supabase
      .from('user_capture_info')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    if (!data) {
      const { data: newData, error: insertError } = await supabase
        .from('user_capture_info')
        .insert({ user_id: userId, capture_count: 0, last_capture_time: new Date().toISOString() })
        .select()
        .single();

      if (insertError) throw insertError;
      return newData;
    }

    return data;
  } catch (error) {
    console.error('Erro ao obter informações de captura:', error);
    return null;
  }
}

export async function updateUserCaptureInfo(userId, captureCount, lastCaptureTime) {
  try {
    const { error } = await supabase
      .from('user_capture_info')
      .update({ capture_count: captureCount, last_capture_time: lastCaptureTime })
      .eq('user_id', userId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Erro ao atualizar informações de captura:', error);
    return false;
  }
}

export async function savePokemonToSupabase(userId, pokemonName, pokemonImage, isShiny, isLegendary, isMythical) {
  try {
    // Primeiro, verifique se o Pokémon já existe para este usuário
    const { data: existingPokemon, error: selectError } = await supabase
      .from('pokemon_generated')
      .select('*')
      .eq('user_id', userId)
      .eq('pokemon_name', pokemonName)
      .eq('is_shiny', isShiny)
      .single();

    if (selectError && selectError.code !== 'PGRST116') throw selectError;

    if (existingPokemon) {
      // Se o Pokémon já existe, atualize a contagem
      const { data: updatedPokemon, error: updateError } = await supabase
        .from('pokemon_generated')
        .update({ count: existingPokemon.count + 1 })
        .eq('id', existingPokemon.id)
        .select()
        .single();

      if (updateError) throw updateError;
      
      console.log('Pokémon atualizado com sucesso:', updatedPokemon);
      return updatedPokemon;
    } else {
      // Se o Pokémon não existe, insira um novo registro
      const { data: newPokemon, error: insertError } = await supabase
        .from('pokemon_generated')
        .insert([{ 
          user_id: userId, 
          pokemon_name: pokemonName, 
          pokemon_image_url: pokemonImage,
          is_shiny: isShiny,
          is_legendary: isLegendary,
          is_mythical: isMythical,
          count: 1
        }])
        .select()
        .single();

      if (insertError) throw insertError;
      
      console.log('Novo Pokémon salvo com sucesso:', newPokemon);
      return newPokemon;
    }
  } catch (error) {
    console.error('Erro ao salvar ou atualizar Pokémon:', error);
    return null;
  }
}