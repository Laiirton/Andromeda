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

export async function savePokemonToSupabase(userId, pokemonName, imageUrl, isShiny, isLegendary, isMythical) {
  try {
    console.log('Tentando salvar Pokémon:', { userId, pokemonName, imageUrl, isShiny, isLegendary, isMythical });
    
    // Primeiro, verificamos se o Pokémon já existe para este usuário
    const { data: existingPokemon, error: selectError } = await supabase
      .from('pokemon_generated')
      .select('*')
      .eq('user_id', userId)
      .eq('pokemon_name', pokemonName)
      .single();

    if (selectError && selectError.code !== 'PGRST116') throw selectError;

    if (existingPokemon) {
      // Se o Pokémon já existe, atualizamos o registro
      const { data, error } = await supabase
        .from('pokemon_generated')
        .update({
          pokemon_image_url: imageUrl,
          is_shiny: isShiny === true,
          is_legendary: isLegendary === true,
          is_mythical: isMythical === true,
          count: existingPokemon.count + 1
        })
        .eq('id', existingPokemon.id)
        .select()
        .single();

      if (error) throw error;
      console.log('Pokémon atualizado com sucesso:', data);
      return data;
    } else {
      // Se o Pokémon não existe, inserimos um novo registro
      const { data, error } = await supabase
        .from('pokemon_generated')
        .insert({
          user_id: userId,
          pokemon_name: pokemonName,
          pokemon_image_url: imageUrl,
          is_shiny: isShiny === true,
          is_legendary: isLegendary === true,
          is_mythical: isMythical === true,
          count: 1
        })
        .select()
        .single();

      if (error) throw error;
      console.log('Novo Pokémon salvo com sucesso:', data);
      return data;
    }
  } catch (error) {
    console.error('Erro ao salvar ou atualizar Pokémon:', error);
    console.error('Detalhes do erro:', JSON.stringify(error, null, 2));
    return null;
  }
}

export async function generateVerificationCode(userId, phoneNumber) {
  try {
    // Gera um código aleatório de 6 dígitos
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Define o tempo de expiração (24 horas a partir de agora)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Insere o código no banco de dados
    const { data: verificationCode, error } = await supabase
      .from('verification_codes')
      .insert({
        user_id: userId,
        phone_number: phoneNumber,
        code: code,
        expires_at: expiresAt.toISOString(),
        used: false
      })
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      code: code,
      expiresAt: expiresAt
    };
  } catch (error) {
    console.error('Erro ao gerar código de verificação:', error);
    return {
      success: false,
      error: 'Erro ao gerar código de verificação'
    };
  }
}

export async function verifyCode(code, phoneNumber) {
  try {
    const now = new Date();

    // Busca o código de verificação
    const { data: verificationCode, error } = await supabase
      .from('verification_codes')
      .select('*')
      .eq('code', code)
      .eq('phone_number', phoneNumber)
      .eq('used', false)
      .gte('expires_at', now.toISOString())
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return {
          success: false,
          error: 'Código inválido, expirado ou já utilizado'
        };
      }
      throw error;
    }

    // Marca o código como usado
    const { error: updateError } = await supabase
      .from('verification_codes')
      .update({ used: true })
      .eq('id', verificationCode.id);

    if (updateError) throw updateError;

    return {
      success: true,
      userId: verificationCode.user_id
    };
  } catch (error) {
    console.error('Erro ao verificar código:', error);
    return {
      success: false,
      error: 'Erro ao verificar código'
    };
  }
}
