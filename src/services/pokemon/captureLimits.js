import { supabase } from './database.js';

const CAPTURES_PER_HOUR = 10;
const HOURS_UNTIL_RESET = 2; // Novo: define o número de horas até o reset
const HOUR_IN_MILLISECONDS = 60 * 60 * 1000;
const RESET_TIME = HOURS_UNTIL_RESET * HOUR_IN_MILLISECONDS; // Novo: calcula o tempo total de reset
const SACRIFICE_TIME_REDUCTION = 15 * 60 * 1000; // 15 minutos em milissegundos

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
        captures_per_hour: CAPTURES_PER_HOUR,
        extra_captures: 0,
        trades_today: 0,
        last_trade_date: new Date().toISOString().split('T')[0],
        last_capture_time: new Date().toISOString(),
        captures_since_last_reset: 0
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

  const currentTime = new Date();
  const lastCaptureTime = new Date(userLimit.last_capture_time);
  const timeDifference = currentTime - lastCaptureTime;

  if (timeDifference >= RESET_TIME) {
    // Resetar contagem se passou o tempo de reset
    const { error: resetError } = await supabase
      .from('user_capture_limits')
      .update({ 
        captures_since_last_reset: 1, 
        last_capture_time: currentTime.toISOString(),
        username
      })
      .eq('user_id', userId);

    if (resetError) {
      console.error('Erro ao resetar contagem de capturas:', resetError);
      throw resetError;
    }

    return { 
      canCapture: true, 
      remainingCaptures: userLimit.captures_per_hour + userLimit.extra_captures - 1,
      nextCaptureTime: null
    };
  }

  if (userLimit.captures_since_last_reset >= userLimit.captures_per_hour + userLimit.extra_captures) {
    const timeUntilReset = RESET_TIME - timeDifference;
    const nextCaptureTime = new Date(currentTime.getTime() + timeUntilReset);
    return { 
      canCapture: false, 
      remainingCaptures: 0,
      nextCaptureTime
    };
  }

  const { error: updateError } = await supabase
    .from('user_capture_limits')
    .update({ 
      captures_since_last_reset: userLimit.captures_since_last_reset + 1,
      last_capture_time: currentTime.toISOString(),
      username
    })
    .eq('user_id', userId);

  if (updateError) {
    console.error('Erro ao atualizar contagem de capturas:', updateError);
    throw updateError;
  }

  return { 
    canCapture: true, 
    remainingCaptures: userLimit.captures_per_hour + userLimit.extra_captures - (userLimit.captures_since_last_reset + 1),
    nextCaptureTime: null
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
    const currentTime = new Date();
    const lastCaptureTime = new Date(userLimit.last_capture_time);
    const timeDifference = currentTime - lastCaptureTime;

    if (timeDifference >= HOUR_IN_MILLISECONDS) {
      return userLimit.captures_per_hour + userLimit.extra_captures;
    }

    return Math.max(0, userLimit.captures_per_hour + userLimit.extra_captures - userLimit.captures_since_last_reset);
  } catch (error) {
    console.error('Erro ao obter capturas restantes:', error);
    throw error;
  }
}

export async function getCapturesRemaining(userId, username) {
  try {
    const userLimit = await getUserCaptureLimit(userId, username);
    const currentTime = new Date();
    const lastCaptureTime = new Date(userLimit.last_capture_time);
    const timeDifference = currentTime - lastCaptureTime;

    if (timeDifference >= RESET_TIME) {
      return {
        remainingCaptures: userLimit.captures_per_hour + userLimit.extra_captures,
        nextCaptureTime: null
      };
    }

    const remainingCaptures = Math.max(0, userLimit.captures_per_hour + userLimit.extra_captures - userLimit.captures_since_last_reset);
    const nextCaptureTime = remainingCaptures === 0 ? new Date(lastCaptureTime.getTime() + RESET_TIME) : null;

    return {
      remainingCaptures,
      nextCaptureTime
    };
  } catch (error) {
    console.error('Erro ao obter capturas restantes:', error);
    throw error;
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

export async function sacrificePokemon(userId, username, pokemonName) {
  try {
    const { data: userLimit, error: limitError } = await supabase
      .from('user_capture_limits')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (limitError) throw limitError;

    const currentTime = new Date();
    const lastCaptureTime = new Date(userLimit.last_capture_time);
    const timeDifference = currentTime - lastCaptureTime;

    if (timeDifference < RESET_TIME) {
      const newLastCaptureTime = new Date(lastCaptureTime.getTime() - SACRIFICE_TIME_REDUCTION);
      
      const { error: updateError } = await supabase
        .from('user_capture_limits')
        .update({ 
          last_capture_time: newLastCaptureTime.toISOString(),
          username
        })
        .eq('user_id', userId);

      if (updateError) throw updateError;

      const remainingTime = RESET_TIME - (currentTime - newLastCaptureTime);
      const minutesRemaining = Math.ceil(remainingTime / (60 * 1000));

      return {
        success: true,
        message: `Você sacrificou ${pokemonName} e reduziu o tempo de espera em 15 minutos.`,
        minutesRemaining
      };
    } else {
      return {
        success: false,
        message: "Você já pode capturar novamente. Não é necessário sacrificar um Pokémon."
      };
    }
  } catch (error) {
    console.error('Erro ao sacrificar Pokémon:', error);
    throw error;
  }
}

export async function updateCapturesRemaining(userId, capturesUsed) {
  try {
    const { data: userLimit, error: limitError } = await supabase
      .from('user_capture_limits')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (limitError) throw limitError;

    const newCapturesSinceLastReset = userLimit.captures_since_last_reset + capturesUsed;
    const remainingCaptures = Math.max(0, userLimit.captures_per_hour + userLimit.extra_captures - newCapturesSinceLastReset);

    const { error: updateError } = await supabase
      .from('user_capture_limits')
      .update({ 
        captures_since_last_reset: newCapturesSinceLastReset
      })
      .eq('user_id', userId);

    if (updateError) throw updateError;

    return remainingCaptures;
  } catch (error) {
    console.error('Erro ao atualizar capturas restantes:', error);
    throw error;
  }
}

// As funções tradePokemonForCaptures e getTradeStatus permanecem inalteradas