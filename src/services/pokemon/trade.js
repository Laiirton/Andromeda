import { supabase } from './database.js';
import { getOrCreateUser } from '../userService.js';

const TRADE_EXPIRATION_TIME = 1 * 60 * 1000; // 1 minuto em milissegundos

async function cleanupExpiredTrades() {
  const expirationDate = new Date(Date.now() - TRADE_EXPIRATION_TIME);
  
  const { error } = await supabase
    .from('pokemon_trades')
    .update({ status: 'expired' })
    .eq('status', 'pending')
    .lt('created_at', expirationDate.toISOString());

  if (error) console.error('Erro ao limpar trocas expiradas:', error);
}

export async function initiateTrade(initiatorUsername, initiatorPhoneNumber, receiverUsername, receiverPhoneNumber, pokemonName) {
  try {
    await cleanupExpiredTrades();

    const initiator = await getOrCreateUser(initiatorUsername, initiatorPhoneNumber);
    const receiver = await getOrCreateUser(receiverUsername, receiverPhoneNumber);

    if (!initiator || !receiver) {
      console.error('Falha ao criar ou obter usuários:', { initiator, receiver });
      return { error: 'Não foi possível identificar um ou ambos os usuários. Verifique se os números de telefone estão corretos.' };
    }

    const pendingTrades = await getPendingTradesForUser(initiator.id);
    if (pendingTrades.length > 0) {
      return { error: 'Você já tem uma troca pendente. Use !pendingtrades para ver suas trocas pendentes.' };
    }

    const { data: initiatorPokemon, error: pokemonError } = await supabase
      .from('pokemon_generated')
      .select('id, pokemon_name')
      .eq('user_id', initiator.id)
      .ilike('pokemon_name', pokemonName)
      .limit(1);

    if (pokemonError) throw pokemonError;
    if (!initiatorPokemon || initiatorPokemon.length === 0) {
      return { error: 'Pokémon não encontrado na sua coleção' };
    }

    const { data: trade, error: tradeError } = await supabase
      .from('pokemon_trades')
      .insert({
        initiator_user_id: initiator.id,
        receiver_user_id: receiver.id,
        initiator_pokemon_id: initiatorPokemon[0].id,
        status: 'pending'
      })
      .select()
      .single();

    if (tradeError) throw tradeError;

    console.log('Troca iniciada com sucesso:', trade);

    return {
      message: `Proposta de troca iniciada. Aguardando resposta de ${receiver.username}.`,
      tradeId: trade.id,
      pokemonName: initiatorPokemon[0].pokemon_name
    };
  } catch (error) {
    console.error('Erro ao iniciar troca:', error);
    return { error: 'Ocorreu um erro ao iniciar a troca. Por favor, tente novamente.' };
  }
}

export async function respondToTrade(responderUsername, responderPhoneNumber, tradeId, acceptTrade, respondPokemonName) {
  try {
    const responder = await getOrCreateUser(responderUsername, responderPhoneNumber);

    if (!responder) {
      throw new Error('Usuário não encontrado');
    }

    const { data: trade, error: tradeError } = await supabase
      .from('pokemon_trades')
      .select(`
        *,
        initiator_pokemon:initiator_pokemon_id(pokemon_name),
        initiator:initiator_user_id(username)
      `)
      .eq('id', tradeId)
      .eq('receiver_user_id', responder.id)
      .eq('status', 'pending')
      .single();

    if (tradeError) {
      if (tradeError.code === 'PGRST116') {
        return { error: 'Proposta de troca não encontrada ou já finalizada' };
      }
      throw tradeError;
    }

    if (!trade) {
      return { error: 'Você não tem nenhuma proposta de troca pendente.' };
    }

    if (acceptTrade) {
      const { data: responderPokemon, error: pokemonError } = await supabase
        .from('pokemon_generated')
        .select('id')
        .eq('user_id', responder.id)
        .ilike('pokemon_name', respondPokemonName)
        .limit(1);

      if (pokemonError || !responderPokemon.length) {
        return { error: 'Pokémon não encontrado na sua coleção' };
      }

      const { error: updateError } = await supabase
        .from('pokemon_trades')
        .update({
          receiver_pokemon_id: responderPokemon[0].id,
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', tradeId);

      if (updateError) throw updateError;

      await swapPokemons(trade.initiator_user_id, trade.receiver_user_id, trade.initiator_pokemon_id, responderPokemon[0].id);

      return { 
        message: 'Troca concluída com sucesso!',
        initiatorPokemon: trade.initiator_pokemon.pokemon_name,
        responderPokemon: respondPokemonName,
        initiatorUsername: trade.initiator.username
      };
    } else {
      const { error: updateError } = await supabase
        .from('pokemon_trades')
        .update({
          status: 'rejected',
          updated_at: new Date().toISOString()
        })
        .eq('id', tradeId);

      if (updateError) throw updateError;

      return { 
        message: 'Proposta de troca recusada.',
        initiatorUsername: trade.initiator.username
      };
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

export async function getPendingTradeForUser(username, phoneNumber) {
  try {
    const user = await getOrCreateUser(username, phoneNumber);
    if (!user) {
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
        initiator:initiator_user_id(username),
        initiator_pokemon:initiator_pokemon_id(pokemon_name)
      `)
      .or(`receiver_user_id.eq.${user.id},initiator_user_id.eq.${user.id}`)
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
      initiator: pendingTrade.initiator.username,
      pokemonOffered: pendingTrade.initiator_pokemon.pokemon_name,
      createdAt: pendingTrade.created_at,
      isInitiator: pendingTrade.initiator_user_id === user.id
    } : null;
  } catch (error) {
    console.error('Erro ao buscar troca pendente:', error);
    return { error: error.message };
  }
}

export async function getPendingTradesForUser(userId) {
  try {
    await cleanupExpiredTrades();

    const { data: pendingTrades, error } = await supabase
      .from('pokemon_trades')
      .select(`
        id,
        initiator_user_id,
        receiver_user_id,
        initiator_pokemon_id,
        status,
        created_at,
        initiator:initiator_user_id(username),
        receiver:receiver_user_id(username),
        initiator_pokemon:initiator_pokemon_id(pokemon_name)
      `)
      .or(`initiator_user_id.eq.${userId},receiver_user_id.eq.${userId}`)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return pendingTrades.map(trade => ({
      id: trade.id,
      initiator: trade.initiator.username,
      receiver: trade.receiver.username,
      pokemonOffered: trade.initiator_pokemon.pokemon_name,
      createdAt: trade.created_at,
      isInitiator: trade.initiator_user_id === userId
    }));
  } catch (error) {
    console.error('Erro ao listar trocas pendentes:', error);
    return { error: error.message };
  }
}
