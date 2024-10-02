import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function getOrCreateUser(username, phoneNumber) {
  try {
    // Primeiro, tenta encontrar o usuário pelo número de telefone ou nome de usuário
    let { data: user, error } = await supabase
      .from('users')
      .select('id, username, phone_number')
      .or(`phone_number.eq.${phoneNumber},username.ilike.${username}`)
      .maybeSingle();

    if (error) throw error;

    if (!user) {
      // Se não encontrar, cria um novo usuário
      const cleanUsername = username.replace(/[^a-zA-Z0-9]/g, '');
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({ username: cleanUsername, phone_number: phoneNumber })
        .select('id, username, phone_number')
        .single();

      if (insertError) throw insertError;
      user = newUser;
    } else if (user.phone_number !== phoneNumber) {
      // Atualiza o número de telefone se for diferente
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({ phone_number: phoneNumber })
        .eq('id', user.id)
        .select('id, username, phone_number')
        .single();

      if (updateError) throw updateError;
      user = updatedUser;
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
    const { data, error } = await supabase
      .from('pokemon_generated')
      .insert([{ 
        user_id: userId, 
        pokemon_name: pokemonName, 
        pokemon_image_url: pokemonImage,
        is_shiny: isShiny,
        is_legendary: isLegendary,
        is_mythical: isMythical
      }]);
    
    if (error) throw error;
    
    console.log('Pokémon salvo com sucesso:', { userId, pokemonName, pokemonImage, isShiny, isLegendary, isMythical });
    return { userId, pokemonName, pokemonImage, isShiny, isLegendary, isMythical };
  } catch (error) {
    console.error('Erro ao salvar Pokémon:', error);
    return null;
  }
}