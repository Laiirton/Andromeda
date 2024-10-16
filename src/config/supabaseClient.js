import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('As variáveis de ambiente SUPABASE_URL e SUPABASE_ANON_KEY devem ser definidas');
}

export const supabase = createClient(supabaseUrl, supabaseKey);