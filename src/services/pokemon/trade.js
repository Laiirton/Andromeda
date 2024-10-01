import { supabase } from './database.js';
import { getOrCreateUser } from './database.js';

const TRADE_EXPIRATION_TIME = 24 * 60 * 60 * 1000; // 24 horas em milissegundos

async function cleanupExpiredTrades() {
  const expirationDate = new Date(Date.now() - TRADE_EXPIRATION_TIME);
  
  const { error } = await supabase
    .from('pokemon_trades')
    .update({ status: 'expired' })
    .eq('status', 'pending')
    .lt('created_at', expirationDate.toISOString());

  if (error) console.error('Erro ao limpar trocas expiradas:', error);
}

export async function initiateTrade(initiatorUsername, receiverUsername, pokemonName) {
  try {
    await cleanupExpiredTrades(); // Limpa trocas expiradas antes de iniciar uma nova

    const initiatorId = await getOrCreateUser(initiatorUsername);
    const receiverId = await getOrCreateUser(receiverUsername);

    if (!initiatorId || !receiverId) {
      throw new Error('Um dos usuários não foi encontrado');
    }

    // Verificar trocas pendentes
    const pendingTrades = await getPendingTradesForUser(initiatorUsername);
    if (pendingTrades.length > 0) {
      return { error: 'Você já tem uma troca pendente. Use !pendingtrades para ver suas trocas pendentes.' };
    }

    // Verificar se o iniciador possui o Pokémon (case insensitive)
    const { data: initiatorPokemon, error: pokemonError } = await supabase
      .from('pokemon_generated')
      .select('id, pokemon_name')
      .eq('user_id', initiatorId)
      .ilike('pokemon_name', pokemonName)
      .limit(1);

    if (pokemonError || !initiatorPokemon.length) {
      throw new Error('Pokémon não encontrado na sua coleção');
    }

    // Criar a proposta de troca
    const { data: trade, error: tradeError } = await supabase
      .from('pokemon_trades')
      .insert({
        initiator_user_id: initiatorId,
        receiver_user_id: receiverId,
        initiator_pokemon_id: initiatorPokemon[0].id,
        status: 'pending'
      })
      .select()
      .single();

    if (tradeError) throw tradeError;

    return {
      message: `Proposta de troca iniciada. Aguardando resposta de ${receiverUsername}.`,
      tradeId: trade.id,
      pokemonName: initiatorPokemon[0].pokemon_name
    };
  } catch (error) {
    console.error('Erro ao iniciar troca:', error);
    return { error: error.message };
  }
}

export async function respondToTrade(responderUsername, tradeId, acceptTrade, respondPokemonName) {
  try {
    const responderId = await getOrCreateUser(responderUsername);

    if (!responderId) {
      throw new Error('Usuário não encontrado');
    }

    // Verificar se a troca existe e está pendente
    const { data: trade, error: tradeError } = await supabase
      .from('pokemon_trades')
      .select('*, pokemon_generated(pokemon_name)')
      .eq('id', tradeId)
      .eq('receiver_user_id', responderId)
      .eq('status', 'pending')
      .single();

    if (tradeError || !trade) {
      throw new Error('Proposta de troca não encontrada ou já finalizada');
    }

    if (acceptTrade) {
      // Verificar se o respondedor possui o Pokémon oferecido
      const { data: responderPokemon, error: pokemonError } = await supabase
        .from('pokemon_generated')
        .select('id')
        .eq('user_id', responderId)
        .eq('pokemon_name', respondPokemonName.toLowerCase())
        .limit(1);

      if (pokemonError || !responderPokemon.length) {
        throw new Error('Pokémon não encontrado na sua coleção');
      }

      // Atualizar a troca
      const { error: updateError } = await supabase
        .from('pokemon_trades')
        .update({
          receiver_pokemon_id: responderPokemon[0].id,
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', tradeId);

      if (updateError) throw updateError;

      // Trocar os Pokémon entre os usuários
      await swapPokemons(trade.initiator_user_id, trade.receiver_user_id, trade.initiator_pokemon_id, responderPokemon[0].id);

      return { 
        message: 'Troca concluída com sucesso!',
        initiatorPokemon: trade.pokemon_generated.pokemon_name,
        responderPokemon: respondPokemonName
      };
    } else {
      // Recusar a troca
      const { error: updateError } = await supabase
        .from('pokemon_trades')
        .update({
          status: 'rejected',
          updated_at: new Date().toISOString()
        })
        .eq('id', tradeId);

      if (updateError) throw updateError;

      return { message: 'Proposta de troca recusada.' };
    }
  } catch (error) {
    console.error('Erro ao responder à troca:', error);
    return { error: error.message };
  }
}

async function swapPokemons(initiatorId, receiverId, initiatorPokemonId, receiverPokemonId) {
  const { error: swapError } = await supabase.rpc('swap_pokemons', {
    p_initiator_id: initiatorId,
    p_receiver_id: receiverId,
    p_initiator_pokemon_id: initiatorPokemonId,
    p_receiver_pokemon_id: receiverPokemonId
  });

  if (swapError) throw swapError;
}

export async function getPendingTradeForUser(username) {
  try {
    const userId = await getOrCreateUser(username);

    if (!userId) {
      throw new Error('Usuário não encontrado');
    }

    const { data: pendingTrade, error } = await supabase
      .from('pokemon_trades')
      .select(`
        id,
        initiator_user_id,
        receiver_user_id,
        initiator_pokemon_id,
        status,
        created_at,
        users!initiator_user_id(username),
        pokemon_generated!initiator_pokemon_id(pokemon_name)
      `)
      .eq('receiver_user_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Nenhuma troca pendente encontrada
      }
      throw error;
    }

    return pendingTrade ? {
      id: pendingTrade.id,
      initiator: pendingTrade.users.username,
      pokemonOffered: pendingTrade.pokemon_generated.pokemon_name,
      createdAt: pendingTrade.created_at
    } : null;
  } catch (error) {
    console.error('Erro ao buscar troca pendente:', error);
    return { error: error.message };
  }
}

export async function getPendingTradesForUser(username) {
  try {
    const userId = await getOrCreateUser(username);
    if (!userId) throw new Error('Usuário não encontrado');

    await cleanupExpiredTrades(); // Limpa trocas expiradas antes de listar

    const { data: pendingTrades, error } = await supabase
      .from('pokemon_trades')
      .select(`
        id,
        initiator_user_id,
        receiver_user_id,
        initiator_pokemon_id,
        status,
        created_at,
        initiator:users!initiator_user_id(username),
        receiver:users!receiver_user_id(username),
        pokemon:pokemon_generated!initiator_pokemon_id(pokemon_name)
      `)
      .or(`initiator_user_id.eq.${userId},receiver_user_id.eq.${userId}`)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return pendingTrades.map(trade => ({
      id: trade.id,
      initiator: trade.initiator.username,
      receiver: trade.receiver.username,
      pokemonOffered: trade.pokemon.pokemon_name,
      createdAt: trade.created_at,
      isInitiator: trade.initiator_user_id === userId
    }));
  } catch (error) {
    console.error('Erro ao listar trocas pendentes:', error);
    return { error: error.message };
  }
}