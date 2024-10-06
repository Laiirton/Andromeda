import { supabase } from './database.js';

const ADMIN_PHONE_NUMBERS = ['5521965020791', '5522997858959']; // Adicione aqui os números de telefone dos administradores

export async function resetCaptureTime(adminPhoneNumber, targetPhoneNumber) {
  // Remova todos os caracteres não numéricos dos números de telefone
  const cleanAdminNumber = adminPhoneNumber.replace(/\D/g, '');
  const cleanTargetNumber = targetPhoneNumber.replace(/\D/g, '');

  if (!ADMIN_PHONE_NUMBERS.includes(cleanAdminNumber)) {
    return { error: 'Você não tem permissão para usar este comando.' };
  }

  try {
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('phone_number', cleanTargetNumber)
      .single();

    if (userError) throw userError;

    if (!user) {
      return { error: 'Usuário alvo não encontrado.' };
    }

    const { error: updateError } = await supabase
      .from('user_capture_limits')
      .update({ 
        last_capture_time: new Date().toISOString(),
        captures_since_last_reset: 0
      })
      .eq('user_id', user.id);

    if (updateError) throw updateError;

    return { message: `Tempo de captura resetado com sucesso para o usuário ${cleanTargetNumber}!` };
  } catch (error) {
    console.error('Erro ao resetar tempo de captura:', error);
    return { error: 'Ocorreu um erro ao resetar o tempo de captura.' };
  }
}