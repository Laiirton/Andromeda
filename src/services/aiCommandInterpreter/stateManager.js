import { supabase } from '../../config/supabaseClient.js';

export async function isAIInterpreterActive(groupId) {
  const { data, error } = await supabase
    .from('group_settings')
    .select('ai_interpreter_active')
    .eq('group_id', groupId)
    .single();

  if (error) {
    console.error('Erro ao verificar o estado do interpretador AI:', error);
    return false;
  }

  return data ? data.ai_interpreter_active : false;
}

export async function toggleAIInterpreter(groupId, isActive) {
  // Primeiro, verifique se o registro existe
  const { data: existingData, error: checkError } = await supabase
    .from('group_settings')
    .select('id')
    .eq('group_id', groupId)
    .single();

  if (checkError && checkError.code !== 'PGRST116') {
    console.error('Erro ao verificar registro existente:', checkError);
    return null;
  }

  let result;

  if (existingData) {
    // Se o registro existe, atualize-o
    const { data, error } = await supabase
      .from('group_settings')
      .update({ ai_interpreter_active: isActive })
      .eq('group_id', groupId)
      .select();

    if (error) {
      console.error('Erro ao atualizar o estado do interpretador AI:', error);
      return null;
    }
    result = data[0];
  } else {
    // Se o registro não existe, insira um novo
    const { data, error } = await supabase
      .from('group_settings')
      .insert({ group_id: groupId, ai_interpreter_active: isActive })
      .select();

    if (error) {
      console.error('Erro ao inserir novo estado do interpretador AI:', error);
      return null;
    }
    result = data[0];
  }

  return result;
}
