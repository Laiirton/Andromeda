import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { calculateLevelFromXP } from './utils.js';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

const XP_PER_MESSAGE = 10;
const XP_COOLDOWN = 30000; // 30 segundos em milissegundos

export async function toggleLevelSystem(groupId, active) {
  try {
    const { data, error } = await supabase
      .from('group_settings')
      .upsert({ group_id: groupId, level_system_active: active }, { onConflict: 'group_id' })
      .select()
      .single();

    if (error) throw error;

    console.log(`Sistema de níveis ${active ? 'ativado' : 'desativado'} para o grupo ${groupId}`);
    return data.level_system_active;
  } catch (error) {
    console.error('Erro ao alternar sistema de níveis:', error);
    return null;
  }
}

export async function isLevelSystemActive(groupId) {
  try {
    const { data, error } = await supabase
      .from('group_settings')
      .select('level_system_active')
      .eq('group_id', groupId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return false;
      }
      throw error;
    }

    return data.level_system_active;
  } catch (error) {
    console.error('Erro ao verificar status do sistema de níveis:', error);
    return false;
  }
}

export async function processMessage(phoneNumber, groupId, username) {
  if (!await isLevelSystemActive(groupId)) return null;

  try {
    let { data: levelData, error: levelError } = await supabase
      .from('user_levels')
      .select('*')
      .eq('phone_number', phoneNumber)
      .eq('group_id', groupId)
      .single();

    const now = new Date();

    if (levelData) {
      const timeSinceLastMessage = now - new Date(levelData.last_message_timestamp);
      const shouldUpdateXP = timeSinceLastMessage >= XP_COOLDOWN;

      const newXP = shouldUpdateXP ? Math.max(levelData.xp + XP_PER_MESSAGE, 0) : levelData.xp;
      const newLevel = Math.max(calculateLevelFromXP(newXP), 1);
      const leveledUp = newLevel > levelData.level;

      const { data: updatedData, error: updateError } = await supabase
        .from('user_levels')
        .update({
          xp: newXP,
          level: newLevel,
          messages_sent: levelData.messages_sent + 1,
          last_message_timestamp: shouldUpdateXP ? now.toISOString() : levelData.last_message_timestamp,
          username: username
        })
        .eq('id', levelData.id)
        .select()
        .single();

      if (updateError) {
        console.error('Erro ao atualizar dados do usuário:', updateError);
        return null;
      }

      console.log(`Usuário ${username} atualizado: Nível ${updatedData.level}, XP ${updatedData.xp}`);
      return leveledUp ? newLevel : null;
    } else {
      const { data: newLevelData, error: insertError } = await supabase
        .from('user_levels')
        .insert({
          phone_number: phoneNumber,
          username: username,
          group_id: groupId,
          xp: XP_PER_MESSAGE,
          level: 1,
          messages_sent: 1,
          last_message_timestamp: now.toISOString(),
        })
        .select()
        .single();

      if (insertError) {
        console.error('Erro ao inserir novo registro de nível:', insertError);
        return null;
      }

      console.log(`Novo usuário ${username} criado: Nível ${newLevelData.level}, XP ${newLevelData.xp}`);
      return 1;
    }
  } catch (error) {
    console.error('Erro ao processar mensagem:', error);
    return null;
  }
}

export async function getUserLevel(phoneNumber, groupId) {
  try {
    const { data, error } = await supabase
      .from('user_levels')
      .select('*')
      .eq('phone_number', phoneNumber)
      .eq('group_id', groupId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        console.error('Usuário não encontrado');
        return null;
      } else {
        console.error('Erro ao buscar nível do usuário:', error);
        return null;
      }
    }

    return data;
  } catch (error) {
    console.error('Erro ao obter nível do usuário:', error);
    return null;
  }
}

export async function getTopUsers(groupId, limit = 10) {
  try {
    const { data, error } = await supabase
      .from('user_levels')
      .select('*')
      .eq('group_id', groupId)
      .order('level', { ascending: false })
      .order('xp', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Erro ao buscar top usuários:', error);
      return [];
    }

    return data;
  } catch (error) {
    console.error('Erro ao obter top usuários:', error);
    return [];
  }
}