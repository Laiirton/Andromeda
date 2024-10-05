import { supabase } from './database.js';

const ADMIN_PHONE_NUMBER = '5521965020791';

export async function resetCaptureTime(phoneNumber) {
  // Remova todos os caracteres não numéricos do número de telefone
  const cleanPhoneNumber = phoneNumber.replace(/\D/g, '');

  if (cleanPhoneNumber !== ADMIN_PHONE_NUMBER) {
    return { error: 'Você não tem permissão para usar este comando.' };
  }

  try {
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('phone_number', cleanPhoneNumber)
      .single();

    if (userError) throw userError;

    if (!user) {
      return { error: 'Usuário não encontrado.' };
    }

    const { error: updateError } = await supabase
      .from('user_capture_limits')
      .update({ 
        last_capture_time: new Date().toISOString(),
        captures_since_last_reset: 0
      })
      .eq('user_id', user.id);

    if (updateError) throw updateError;

    return { message: 'Tempo de captura resetado com sucesso!' };
  } catch (error) {
    console.error('Erro ao resetar tempo de captura:', error);
    return { error: 'Ocorreu um erro ao resetar o tempo de captura.' };
  }
}