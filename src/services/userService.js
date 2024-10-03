import { supabase } from './pokemon/database.js';

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