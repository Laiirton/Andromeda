import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function isRandomChatActive(groupId) {
  const { data, error } = await supabase
    .from('group_settings')
    .select('random_chat_active')
    .eq('group_id', groupId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error checking random chat status:', error);
    return false;
  }

  return data?.random_chat_active || false;
}

async function toggleRandomChat(groupId) {
  const currentStatus = await isRandomChatActive(groupId);
  const newStatus = !currentStatus;

  let result;
  if (currentStatus !== null) {
    // O grupo já existe, atualize o status
    result = await supabase
      .from('group_settings')
      .update({ random_chat_active: newStatus })
      .eq('group_id', groupId);
  } else {
    // O grupo não existe, insira um novo registro
    result = await supabase
      .from('group_settings')
      .insert({ group_id: groupId, random_chat_active: newStatus });
  }

  if (result.error) {
    console.error('Error toggling random chat status:', result.error);
    return currentStatus;
  }

  return newStatus;
}

export { isRandomChatActive, toggleRandomChat };