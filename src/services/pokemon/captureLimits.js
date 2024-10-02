import { supabase } from './database.js';

const DEFAULT_DAILY_LIMIT = 20;
const MAX_TRADES_PER_DAY = 5;
const CAPTURES_PER_TRADE = 2;

async function getUserCaptureLimit(userId, username) {
  const { data, error } = await supabase
    .from('user_capture_limits')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Erro ao obter limite de captura:', error);
    throw error;
  }

  if (!data) {
    const { data: newLimit, error: insertError } = await supabase
      .from('user_capture_limits')
      .insert({ 
        user_id: userId, 
        username, 
        daily_limit: DEFAULT_DAILY_LIMIT,
        extra_captures: 0,
        trades_today: 0,
        last_trade_date: new Date().toISOString().split('T')[0]
      })
      .select()
      .single();

    if (insertError) {
      console.error('Erro ao criar novo limite de captura:', insertError);
      throw insertError;
    }

    return newLimit;
  }

  // Atualiza o username se necessário
  if (data.username !== username) {
    const { error: updateError } = await supabase
      .from('user_capture_limits')
      .update({ username })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Erro ao atualizar username:', updateError);
      throw updateError;
    }
  }

  return data;
}

async function updateUserCaptureCount(userId, username) {
  const { data: userLimit, error: limitError } = await supabase
    .from('user_capture_limits')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (limitError) {
    console.error('Erro ao obter limite de captura:', limitError);
    throw limitError;
  }

  const currentDate = new Date().toISOString().split('T')[0];

  if (userLimit.last_capture_date !== currentDate) {
    // Resetar contagem diária se for um novo dia
    const { error: resetError } = await supabase
      .from('user_capture_limits')
      .update({ 
        daily_captures: 1, 
        last_capture_date: currentDate,
        username,
        trades_today: 0,
        last_trade_date: currentDate
      })
      .eq('user_id', userId);

    if (resetError) {
      console.error('Erro ao resetar contagem diária:', resetError);
      throw resetError;
    }

    return { canCapture: true, remainingCaptures: userLimit.daily_limit + userLimit.extra_captures - 1 };
  }

  if (userLimit.daily_captures >= userLimit.daily_limit + userLimit.extra_captures) {
    return { canCapture: false, remainingCaptures: 0 };
  }

  const { error: updateError } = await supabase
    .from('user_capture_limits')
    .update({ 
      daily_captures: userLimit.daily_captures + 1,
      username
    })
    .eq('user_id', userId);

  if (updateError) {
    console.error('Erro ao atualizar contagem de capturas:', updateError);
    throw updateError;
  }

  return { 
    canCapture: true, 
    remainingCaptures: userLimit.daily_limit + userLimit.extra_captures - (userLimit.daily_captures + 1) 
  };
}

export async function checkAndUpdateCaptureLimit(userId, username) {
  try {
    await getUserCaptureLimit(userId, username);
    return await updateUserCaptureCount(userId, username);
  } catch (error) {
    console.error('Erro ao verificar e atualizar limite de captura:', error);
    throw error;
  }
}

export async function getRemainingCaptures(userId, username) {
  try {
    const userLimit = await getUserCaptureLimit(userId, username);
    const currentDate = new Date().toISOString().split('T')[0];

    if (userLimit.last_capture_date !== currentDate) {
      return userLimit.daily_limit + userLimit.extra_captures;
    }

    return Math.max(0, userLimit.daily_limit + userLimit.extra_captures - userLimit.daily_captures);
  } catch (error) {
    console.error('Erro ao obter capturas restantes:', error);
    throw error;
  }
}

export async function tradePokemonForCaptures(userId, username) {
  try {
    const userLimit = await getUserCaptureLimit(userId, username);
    const currentDate = new Date().toISOString().split('T')[0];

    if (userLimit.last_trade_date !== currentDate) {
      userLimit.trades_today = 0;
    }

    if (userLimit.trades_today >= MAX_TRADES_PER_DAY) {
      return { error: 'Você atingiu o limite diário de trocas.' };
    }

    const { data: userPokemon, error: pokemonError } = await supabase
      .from('pokemon_generated')
      .select('id')
      .eq('user_id', userId)
      .limit(1);

    if (pokemonError || userPokemon.length === 0) {
      return { error: 'Você não tem Pokémon disponíveis para trocar.' };
    }

    const { error: deleteError } = await supabase
      .from('pokemon_generated')
      .delete()
      .eq('id', userPokemon[0].id);

    if (deleteError) {
      throw deleteError;
    }

    const { error: updateError } = await supabase
      .from('user_capture_limits')
      .update({ 
        extra_captures: userLimit.extra_captures + CAPTURES_PER_TRADE,
        trades_today: userLimit.trades_today + 1,
        last_trade_date: currentDate
      })
      .eq('user_id', userId);

    if (updateError) {
      throw updateError;
    }

    return { 
      success: true, 
      message: `Troca realizada com sucesso! Você ganhou ${CAPTURES_PER_TRADE} capturas extras.`,
      extraCaptures: CAPTURES_PER_TRADE,
      remainingTrades: MAX_TRADES_PER_DAY - (userLimit.trades_today + 1)
    };
  } catch (error) {
    console.error('Erro ao trocar Pokémon por capturas:', error);
    return { error: 'Ocorreu um erro ao realizar a troca. Tente novamente mais tarde.' };
  }
}

export async function getTradeStatus(userId, username) {
  try {
    const userLimit = await getUserCaptureLimit(userId, username);
    const currentDate = new Date().toISOString().split('T')[0];

    if (userLimit.last_trade_date !== currentDate) {
      return {
        tradesAvailable: MAX_TRADES_PER_DAY,
        extraCaptures: userLimit.extra_captures
      };
    }

    return {
      tradesAvailable: Math.max(0, MAX_TRADES_PER_DAY - userLimit.trades_today),
      extraCaptures: userLimit.extra_captures
    };
  } catch (error) {
    console.error('Erro ao obter status de trocas:', error);
    throw error;
  }
}